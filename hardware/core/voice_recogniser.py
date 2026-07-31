"""
voice_recogniser.py — PillSafe Voice Verification Module
=========================================================
Hardware : I2S MEMS microphone (GPIO-based, e.g. INMP441)
Method   : Speaker verification using MFCC feature extraction +
           cosine similarity on mean MFCC vectors.
Challenge: System delivers a random text prompt via the mobile app
           (GET /voice/challenge); user speaks it aloud; Pi records
           and verifies the voice matches the enrolled profile.

Enrolment : 3 utterances captured, mean MFCC vector stored as .npy
Verification: Cosine similarity between live MFCC and stored template
              must exceed SIMILARITY_THRESHOLD (default 0.82).
"""

import os
import logging
import numpy as np
import sounddevice as sd
import librosa
import random
from pathlib import Path

from utils.config import get_config

logger = logging.getLogger(__name__)

# ── Constants (all overridable via config.yaml) ────────────────────────────
SAMPLE_RATE      = 16000   # Hz — INMP441 native rate
DURATION_SEC     = 3       # seconds to record per utterance
N_MFCC           = 40      # number of MFCC coefficients
ENROL_SAMPLES    = 3       # utterances captured during enrolment
SIM_THRESHOLD    = 0.82    # cosine similarity threshold (0–1)
MIN_RMS          = 0.015   # reject near-silence (stops false accepts on empty recordings)
MODELS_DIR       = Path("models/voice")
DEVICE_INDEX     = None    # None = auto-pick VoiceHAT / default input

# Cached after the first successful open so enrolment samples don't retry 16 kHz.
_CAPTURE_CACHE: dict | None = None

# Random prompt pool — displayed on mobile app, spoken by user
CHALLENGE_PROMPTS = [
    "open my medicine",
    "dispense my pills",
    "pillsafe unlock",
    "ready for medication",
    "confirm my dose",
    "give me my pills",
    "pillsafe access",
    "release my medication",
]


class VoiceRecogniser:
    """Compatibility wrapper around the module-level voice helpers."""

    def get_random_challenge(self) -> str:
        return get_random_challenge()

    def enrol_user(self, user_id: int, prompts: list[str] | None = None) -> dict:
        return enrol_user(user_id, prompts=prompts)

    def verify_user(self, user_id: int) -> dict:
        return verify_user(user_id)

    def delete_template(self, user_id: int) -> bool:
        return delete_template(user_id)

    def is_enrolled(self, user_id: int) -> bool:
        return is_enrolled(user_id)

    @property
    def is_available(self) -> bool:
        return audio_input_available()


def audio_input_available() -> bool:
    """Return whether PortAudio exposes a usable input device."""
    try:
        return _resolve_input_device() is not None
    except Exception:
        return False


# ── Helpers ────────────────────────────────────────────────────────────────

def _voice_config():
    try:
        cfg = get_config()
    except Exception:
        return None
    return getattr(cfg, "voice", None)


def _device_field(device_info, key, default=None):
    if device_info is None:
        return default
    try:
        if hasattr(device_info, "get"):
            value = device_info.get(key, default)
        else:
            value = device_info[key]
        return default if value is None else value
    except Exception:
        return default


def _list_input_devices() -> list[tuple[int, object]]:
    devices = []
    try:
        for index, info in enumerate(sd.query_devices()):
            if int(_device_field(info, "max_input_channels", 0) or 0) > 0:
                devices.append((index, info))
    except Exception as exc:
        logger.warning("Unable to list audio input devices: %s", exc)
    return devices


def _auto_pick_input_device() -> int | None:
    """Prefer Google Voice HAT / I2S cards over HDMI or dummy ALSA devices."""
    inputs = _list_input_devices()
    if not inputs:
        return None

    scored = []
    for index, info in inputs:
        name = str(_device_field(info, "name", "")).lower()
        score = 0
        if "voicehat" in name or "googlevoicehat" in name:
            score += 100
        if "i2s" in name or "inmp" in name:
            score += 50
        if "usb" in name:
            score += 20
        if "hdmi" in name or "dummy" in name or "loopback" in name:
            score -= 50
        scored.append((score, index, name))

    scored.sort(key=lambda item: (-item[0], item[1]))
    best_score, best_index, best_name = scored[0]
    if best_score > 0:
        logger.info("Auto-selected audio input %d (%s)", best_index, best_name)
        return best_index

    # Fall back to PortAudio's default input.
    try:
        default = sd.query_devices(kind="input")
        default_name = str(_device_field(default, "name", "default"))
        for index, info in inputs:
            if str(_device_field(info, "name", "")) == default_name:
                return index
    except Exception:
        pass
    return inputs[0][0]


def _resolve_input_device() -> int | None:
    voice_cfg = _voice_config()
    if voice_cfg is not None and getattr(voice_cfg, "device_index", None) is not None:
        return int(voice_cfg.device_index)
    if DEVICE_INDEX is not None:
        return int(DEVICE_INDEX)
    return _auto_pick_input_device()


def _input_device_info(device_index=None):
    try:
        if device_index is None:
            return sd.query_devices(kind="input")
        return sd.query_devices(device_index)
    except Exception:
        return None


def _candidate_capture_rates(preferred: int, device_info=None) -> list[int]:
    """
    Voice HAT / I2S on Raspberry Pi usually only accepts 48000 (sometimes
    44100). Prefer the device default before the MFCC analysis rate.
    """
    default_rate = int(float(_device_field(device_info, "default_samplerate", 0) or 0))
    rates: list[int] = []
    for rate in (
        default_rate,
        48000,
        44100,
        int(preferred),
        32000,
        22050,
        16000,
        8000,
    ):
        if rate > 0 and rate not in rates:
            rates.append(rate)
    return rates


def _candidate_channel_counts(device_info=None) -> list[int]:
    max_channels = int(_device_field(device_info, "max_input_channels", 1) or 1)
    channels: list[int] = []
    # Voice HAT exposes 2 input channels; mono opens often fail.
    for count in (min(2, max_channels), 1, max_channels):
        if count > 0 and count not in channels:
            channels.append(count)
    return channels


def _resample_audio(audio: np.ndarray, capture_rate: int, target_rate: int) -> np.ndarray:
    if capture_rate == target_rate or audio.size == 0:
        return audio.astype(np.float32, copy=False)
    return librosa.resample(
        audio.astype(np.float32),
        orig_sr=capture_rate,
        target_sr=target_rate,
    ).astype(np.float32)


def _to_mono(audio: np.ndarray) -> np.ndarray:
    if audio.ndim == 1:
        return audio
    # Prefer left channel (INMP441 L/R→GND selects left on many breakouts).
    return audio[:, 0].astype(np.float32, copy=False)


def _open_recording(
    duration: float,
    capture_rate: int,
    device,
    channels: int,
) -> np.ndarray:
    audio = sd.rec(
        int(duration * capture_rate),
        samplerate=capture_rate,
        channels=channels,
        dtype="float32",
        device=device,
    )
    sd.wait()
    return _to_mono(np.asarray(audio))


def _record(duration: float = DURATION_SEC, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    """
    Capture audio from the mic, then return samples at ``sample_rate``.

    Google Voice HAT typically needs 48000 Hz stereo. We negotiate a working
    open, cache it, and resample for MFCC consistency.
    """
    global _CAPTURE_CACHE

    configured_device = _resolve_input_device()
    device_info = _input_device_info(configured_device)

    if _CAPTURE_CACHE is not None:
        try:
            audio = _open_recording(
                duration,
                _CAPTURE_CACHE["rate"],
                _CAPTURE_CACHE["device"],
                _CAPTURE_CACHE["channels"],
            )
            return _resample_audio(
                audio, _CAPTURE_CACHE["rate"], sample_rate
            )
        except Exception as exc:
            logger.warning("Cached mic open failed; renegotiating: %s", exc)
            _CAPTURE_CACHE = None

    rates = _candidate_capture_rates(sample_rate, device_info)
    channels_list = _candidate_channel_counts(device_info)
    logger.info(
        "Recording %.1fs (analysis=%d Hz, device=%s, rates=%s, channels=%s)…",
        duration,
        sample_rate,
        configured_device if configured_device is not None else "default",
        rates,
        channels_list,
    )

    last_error = None
    devices_to_try = [configured_device]
    if configured_device is not None:
        # Also try PortAudio default if the chosen index fails.
        devices_to_try.append(None)

    for device in devices_to_try:
        info = device_info if device == configured_device else _input_device_info(device)
        for capture_rate in _candidate_capture_rates(sample_rate, info):
            for channels in _candidate_channel_counts(info):
                try:
                    audio = _open_recording(
                        duration, capture_rate, device, channels
                    )
                    _CAPTURE_CACHE = {
                        "device": device,
                        "rate": capture_rate,
                        "channels": channels,
                    }
                    logger.info(
                        "Mic open OK — device=%s rate=%d channels=%d",
                        device if device is not None else "default",
                        capture_rate,
                        channels,
                    )
                    if capture_rate != sample_rate:
                        audio = _resample_audio(
                            audio, capture_rate, sample_rate
                        )
                    return audio
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "Audio open failed (device=%s, rate=%d, ch=%d): %s",
                        device if device is not None else "default",
                        capture_rate,
                        channels,
                        exc,
                    )

    raise RuntimeError(
        f"No usable microphone sample rate. Last error: {last_error}"
    ) from last_error


def _extract_mfcc(audio: np.ndarray, sample_rate: int = SAMPLE_RATE,
                  n_mfcc: int = N_MFCC) -> np.ndarray:
    """
    Extract mean MFCC feature vector from a raw audio array.
    Returns a 1-D vector of shape (N_MFCC,).
    """
    mfcc = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=n_mfcc)
    return np.mean(mfcc, axis=1)   # shape: (N_MFCC,)


def _audio_rms(audio: np.ndarray) -> float:
    """Root-mean-square energy of a mono float audio buffer."""
    if audio.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio.astype(np.float64)))))


def _speech_energy_ok(audio: np.ndarray, min_rms: float = MIN_RMS) -> tuple[bool, float]:
    """
    Return (ok, rms). Quiet / empty captures produce near-identical MFCCs,
    which can falsely pass cosine similarity — reject them first.
    """
    rms = _audio_rms(audio)
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    ok = rms >= min_rms and peak >= (min_rms * 2.0)
    return ok, rms


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Return cosine similarity in [-1, 1] between two vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _template_path(user_id: int) -> Path:
    cfg = None
    try:
        cfg = get_config()
    except Exception:
        cfg = None

    models_dir = MODELS_DIR
    if cfg is not None:
        voice_cfg = getattr(cfg, "voice", None)
        if voice_cfg is not None and getattr(voice_cfg, "models_dir", None):
            models_dir = Path(voice_cfg.models_dir)

    return models_dir / f"user_{user_id}_voice.npy"


# ── Public API ─────────────────────────────────────────────────────────────

def get_random_challenge() -> str:
    """Return a random text prompt to display on the mobile app."""
    return random.choice(CHALLENGE_PROMPTS)


def enrol_user(user_id: int, prompts: list[str] | None = None) -> dict:
    """
    Capture ENROL_SAMPLES utterances, compute mean MFCC template,
    and save to disk.

    Called by: POST /users/{id}/enrol/voice

    Returns:
        {"success": True, "user_id": user_id}  on success
        {"success": False, "error": "<reason>"} on failure
    """
    cfg = None
    try:
        cfg = get_config()
    except Exception:
        cfg = None

    voice_cfg = getattr(cfg, "voice", None) if cfg is not None else None
    sample_rate = getattr(voice_cfg, "sample_rate", SAMPLE_RATE)
    duration_sec = getattr(voice_cfg, "record_duration_sec", DURATION_SEC)
    mfcc_count = getattr(voice_cfg, "n_mfcc", N_MFCC)
    enrol_samples = getattr(voice_cfg, "enrol_samples", ENROL_SAMPLES)
    min_rms = getattr(voice_cfg, "min_rms", MIN_RMS)
    models_dir = Path(getattr(voice_cfg, "models_dir", MODELS_DIR)) if voice_cfg is not None else MODELS_DIR

    models_dir.mkdir(parents=True, exist_ok=True)
    mfcc_vectors = []
    prompt_list = prompts or []

    for i in range(enrol_samples):
        logger.info("Enrolment sample %d/%d for user %d", i + 1, enrol_samples, user_id)
        if prompt_list:
            prompt_text = prompt_list[i % len(prompt_list)]
            print(f"[VOICE PROMPT] {prompt_text}")
            logger.info("Voice enrolment prompt: %s", prompt_text)
            input("Press ENTER when ready to speak...")

        # Retry quiet captures so silence is never stored as a template.
        captured = False
        for attempt in range(1, 4):
            try:
                audio = _record(duration=duration_sec, sample_rate=sample_rate)
            except Exception as exc:
                logger.error("Enrolment recording failed: %s", exc)
                return {"success": False, "error": str(exc)}

            ok, rms = _speech_energy_ok(audio, min_rms=min_rms)
            logger.info("Enrolment sample %d attempt %d RMS=%.5f", i + 1, attempt, rms)
            if not ok:
                print(f"[WARNING] Too quiet (RMS={rms:.5f}). Speak louder and try again.")
                continue

            vec = _extract_mfcc(audio, sample_rate=sample_rate, n_mfcc=mfcc_count)
            mfcc_vectors.append(vec)
            captured = True
            break

        if not captured:
            return {
                "success": False,
                "error": "no_speech",
                "detail": f"Sample {i + 1}/{enrol_samples} had no usable speech energy",
            }

    template = np.mean(mfcc_vectors, axis=0)  # shape: (N_MFCC,)
    np.save(models_dir / f"user_{user_id}_voice.npy", template)
    logger.info("Voice template saved for user %d", user_id)
    return {"success": True, "user_id": user_id}


def verify_user(user_id: int) -> dict:
    """
    Record one utterance and compare against the stored template.

    Called by: main control loop (voice auth path)

    Returns:
        {"verified": True,  "similarity": float}  on ACCEPT
        {"verified": False, "similarity": float}  on REJECT
        {"verified": False, "error": "<reason>"}  on hard failure
    """
    cfg = None
    try:
        cfg = get_config()
    except Exception:
        cfg = None

    voice_cfg = getattr(cfg, "voice", None) if cfg is not None else None
    threshold = getattr(voice_cfg, "similarity_threshold", SIM_THRESHOLD)
    sample_rate = getattr(voice_cfg, "sample_rate", SAMPLE_RATE) if voice_cfg is not None else SAMPLE_RATE
    duration_sec = getattr(voice_cfg, "record_duration_sec", DURATION_SEC) if voice_cfg is not None else DURATION_SEC
    mfcc_count = getattr(voice_cfg, "n_mfcc", N_MFCC) if voice_cfg is not None else N_MFCC
    min_rms = getattr(voice_cfg, "min_rms", MIN_RMS) if voice_cfg is not None else MIN_RMS
    path = _template_path(user_id)
    if not path.exists():
        logger.warning("No voice template found for user %d", user_id)
        return {"verified": False, "error": "no_template"}

    template = np.load(path)

    try:
        audio = _record(duration=duration_sec, sample_rate=sample_rate)
    except Exception as exc:
        logger.error("Verification recording failed: %s", exc)
        return {"verified": False, "error": str(exc)}

    ok, rms = _speech_energy_ok(audio, min_rms=min_rms)
    logger.info("Verification RMS=%.5f (min=%.5f)", rms, min_rms)
    if not ok:
        logger.warning(
            "Voice verification for user %d rejected: no speech energy (RMS=%.5f)",
            user_id, rms,
        )
        return {
            "verified": False,
            "similarity": 0.0,
            "error": "no_speech",
            "rms": round(rms, 5),
        }

    live_vec = _extract_mfcc(audio, sample_rate=sample_rate, n_mfcc=mfcc_count)
    similarity = _cosine_similarity(live_vec, template)
    verified = similarity >= threshold

    logger.info(
        "Voice verification for user %d: similarity=%.4f threshold=%.2f rms=%.5f → %s",
        user_id, similarity, threshold, rms, "ACCEPT" if verified else "REJECT"
    )
    return {"verified": verified, "similarity": round(similarity, 4), "rms": round(rms, 5)}


def delete_template(user_id: int) -> bool:
    """Remove stored voice template when a user is deleted."""
    path = _template_path(user_id)
    if path.exists():
        path.unlink()
        logger.info("Voice template deleted for user %d", user_id)
        return True
    return False


def is_enrolled(user_id: int) -> bool:
    """Return True if a voice template exists for this user."""
    return _template_path(user_id).exists()

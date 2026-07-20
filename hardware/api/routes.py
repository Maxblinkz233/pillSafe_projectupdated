"""
PillSafe — Flask REST API
Provides JSON endpoints for the React Native mobile application (SDR §5).
All endpoints except /health require Bearer token authentication (FR-22).
"""

import os
import hmac
import functools
from flask import Flask, request, jsonify

from database.db_manager import DatabaseManager
from enrollment.enrol_user import EnrolmentManager
from utils.config import get_config
from utils.logger import setup_logger

logger = setup_logger("pillsafe.api")

try:
    from core import voice_recogniser as vr
except Exception:  # pragma: no cover - optional when sounddevice/librosa missing
    vr = None

DEFAULT_TOKEN = "CHANGE_ME_ON_FIRST_SETUP"


def _voice_enabled() -> bool:
    cfg = get_config()
    voice_cfg = getattr(cfg, "voice", None)
    return bool(voice_cfg and getattr(voice_cfg, "enabled", False) and vr is not None)


def _public_user(user: dict | None) -> dict | None:
    """Never expose password hashes through the mobile API."""
    if user is None:
        return None
    return {key: value for key, value in user.items() if key != "password_hash"}


def create_app(db: DatabaseManager,
               enrolment_manager: EnrolmentManager | None = None,
               rtc=None, gsm=None, camera=None,
               verify_dispense_fn=None) -> Flask:
    """
    Factory function to create the Flask app with injected dependencies.

    verify_dispense_fn: optional callable(user_id, schedule_id, auth_mode)
        → dict used by POST /dispense/verify for blocking face/voice auth.
    """
    app = Flask(__name__)
    app.config["VERIFY_DISPENSE_FN"] = verify_dispense_fn
    cfg = get_config()
    # Prefer an environment-provided token; fall back to config. Warn loudly
    # if the insecure default is still in use (FR-22).
    api_token = os.environ.get("PILLSAFE_API_TOKEN") or cfg.api.token
    if api_token == DEFAULT_TOKEN:
        logger.warning(
            "API token is still the insecure default — set api.token in "
            "config.yaml or the PILLSAFE_API_TOKEN environment variable."
        )

    # ── Authentication Middleware ─────────────────────────────

    def require_auth(f):
        """Decorator to enforce Bearer token authentication (FR-22)."""
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"status": "error", "error": "Missing Bearer token"}), 401
            token = auth_header.split("Bearer ", 1)[1]
            # Constant-time comparison to avoid token timing attacks
            if not hmac.compare_digest(token, api_token):
                return jsonify({"status": "error", "error": "Invalid token"}), 401
            return f(*args, **kwargs)
        return decorated

    # ── Health Endpoint (FR-25) ──────────────────────────────

    @app.route("/health", methods=["GET"])
    def health():
        """System status endpoint — no auth required."""
        microphone_available = False
        if _voice_enabled() and vr is not None:
            try:
                microphone_available = bool(vr.audio_input_available())
            except Exception:
                microphone_available = False
        devices = {
            "pi_hub": True,
            "gsm": bool(gsm and gsm.is_available),
            "rtc": bool(rtc and rtc.is_available),
            "camera": bool(camera and camera.is_available),
            "microphone": microphone_available,
        }
        status = {
            "system": "running",
            "rtc_available": devices["rtc"],
            "gsm_available": devices["gsm"],
            "camera_available": devices["camera"],
            "microphone_available": devices["microphone"],
            "devices": devices,
            "connected_device_count": sum(1 for available in devices.values()
                                          if available),
        }
        return jsonify({"status": "success", "data": status}), 200

    # ── User Endpoints (FR-19) ───────────────────────────────

    @app.route("/users", methods=["GET"])
    @require_auth
    def get_users():
        users = [_public_user(user) for user in db.get_all_users()]
        return jsonify({"status": "success", "data": users}), 200

    @app.route("/auth/login", methods=["POST"])
    @require_auth
    def login():
        data = request.get_json(silent=True) or {}
        full_name = str(data.get("full_name", "")).strip()
        password = str(data.get("password", ""))
        if not full_name or not password:
            return jsonify({"status": "error",
                            "error": "full_name and password required"}), 400
        user = db.authenticate_user(full_name, password)
        if not user:
            return jsonify({"status": "error",
                            "error": "Invalid patient name or password"}), 401
        return jsonify({"status": "success", "data": _public_user(user)}), 200

    @app.route("/auth/claim", methods=["POST"])
    @require_auth
    def claim_account():
        data = request.get_json(silent=True) or {}
        required = ["full_name", "caregiver_phone", "password"]
        if any(not str(data.get(field, "")).strip() for field in required):
            return jsonify({"status": "error",
                            "error": "Name, caregiver phone, and password required"}), 400
        if len(str(data["password"])) < 8:
            return jsonify({"status": "error",
                            "error": "Password must be at least 8 characters"}), 400
        try:
            user = db.claim_user(
                str(data["full_name"]),
                str(data["caregiver_phone"]),
                str(data["password"]),
                caregiver_name=data.get("caregiver_name"),
            )
            return jsonify({"status": "success",
                            "data": _public_user(user)}), 200
        except ValueError as exc:
            return jsonify({"status": "error", "error": str(exc)}), 400

    @app.route("/users", methods=["POST"])
    @require_auth
    def create_user():
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "JSON body required"}), 400
        required = [
            "full_name", "password", "caregiver_name",
            "caregiver_phone", "compartment_index",
        ]
        for field in required:
            if field not in data or (
                    field != "compartment_index"
                    and not str(data.get(field, "")).strip()
            ):
                return jsonify({"status": "error",
                                "error": f"Missing field: {field}"}), 400
        try:
            if len(str(data["password"])) < 8:
                return jsonify({"status": "error",
                                "error": "Password must be at least 8 characters"}), 400
            user_id = db.create_user(
                data["full_name"], data["caregiver_phone"],
                int(data["compartment_index"]),
                caregiver_name=data["caregiver_name"],
                password=data["password"],
            )
            return jsonify({"status": "success",
                            "data": {"user_id": user_id}}), 201
        except Exception as e:
            return jsonify({"status": "error", "error": str(e)}), 400

    @app.route("/users/<int:user_id>", methods=["PUT"])
    @require_auth
    def update_user(user_id):
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "JSON body required"}), 400
        success = db.update_user(user_id, **data)
        if success:
            return jsonify({"status": "success",
                            "data": _public_user(db.get_user(user_id))}), 200
        return jsonify({"status": "error", "error": "Update failed"}), 400

    @app.route("/users/<int:user_id>", methods=["DELETE"])
    @require_auth
    def delete_user(user_id):
        if enrolment_manager:
            enrolment_manager.remove_user_data(user_id)
        success = db.delete_user(user_id)
        if success:
            return jsonify({"status": "success",
                            "data": {"deleted": user_id}}), 200
        return jsonify({"status": "error", "error": "User not found"}), 404

    # ── Enrolment Endpoint ───────────────────────────────────

    @app.route("/users/<int:user_id>/enrol", methods=["POST"])
    @require_auth
    def enrol_user(user_id):
        if not enrolment_manager:
            return jsonify({"status": "error",
                            "error": "Enrolment not available"}), 503
        success, message = enrolment_manager.enrol_user(user_id)
        status_code = 200 if success else 400
        return jsonify({"status": "success" if success else "error",
                        "data" if success else "error": message}), status_code

    # ── Voice Endpoints (FR-57 / FR-56) ─────────────────────

    @app.route("/voice/challenge", methods=["GET"])
    @require_auth
    def get_voice_challenge():
        if not _voice_enabled():
            return jsonify({"status": "error", "error": "Voice auth disabled"}), 503
        prompt = vr.get_random_challenge()
        return jsonify({"status": "success", "data": {"prompt": prompt}}), 200

    @app.route("/users/<int:user_id>/enrol/voice", methods=["POST"])
    @require_auth
    def enrol_voice(user_id):
        if not _voice_enabled():
            return jsonify({"status": "error", "error": "Voice auth disabled"}), 503
        if not enrolment_manager:
            return jsonify({"status": "error", "error": "Enrolment not available"}), 503
        success, message = enrolment_manager.enrol_voice_user(user_id)
        if success and "skipped" in message.lower():
            return jsonify({"status": "error", "error": "Voice enrolment unavailable"}), 503
        if success:
            return jsonify({"status": "success", "data": {"user_id": user_id, "message": message}}), 200
        return jsonify({"status": "error", "error": message}), 400

    @app.route("/users/<int:user_id>/enrol/status", methods=["GET"])
    @require_auth
    def enrol_status(user_id):
        user = db.get_user(user_id)
        if not user:
            return jsonify({"status": "error", "error": "User not found"}), 404

        voice_enrolled = False
        if vr is not None:
            try:
                voice_enrolled = bool(vr.is_enrolled(user_id))
            except Exception:
                voice_enrolled = False

        return jsonify({
            "status": "success",
            "data": {
                "user_id": user_id,
                "face_enrolled": bool(user["enrolment_status"]),
                "voice_enrolled": voice_enrolled,
                "voice_enabled": _voice_enabled(),
            }
        }), 200

    @app.route("/dispense/request", methods=["POST"])
    @require_auth
    def dispense_request():
        body = request.get_json(silent=True) or {}
        raw_user_id = body.get("user_id")
        raw_schedule_id = body.get("schedule_id")
        auth_mode = body.get("auth_mode", "face")

        if auth_mode not in ("face", "voice"):
            return jsonify({"status": "error", "error": "Invalid auth_mode"}), 400
        if auth_mode == "voice" and not _voice_enabled():
            return jsonify({"status": "error", "error": "Voice auth disabled"}), 503
        if raw_user_id is None:
            return jsonify({"status": "error", "error": "user_id required"}), 400

        try:
            user_id = int(raw_user_id)
        except (TypeError, ValueError):
            return jsonify({"status": "error", "error": "user_id must be an integer"}), 400

        schedule_id = None
        if raw_schedule_id is not None:
            try:
                schedule_id = int(raw_schedule_id)
            except (TypeError, ValueError):
                return jsonify({"status": "error", "error": "schedule_id must be an integer"}), 400

        app.config["PENDING_AUTH"] = {
            "user_id": user_id,
            "schedule_id": schedule_id,
            "mode": auth_mode,
        }

        return jsonify({"status": "success", "data": {"accepted": True}}), 200

    @app.route("/dispense/verify", methods=["POST"])
    @require_auth
    def dispense_verify():
        """
        Blocking Verify Now: activate hub camera (or hand off to an active
        grace-window event), run face/voice auth, then dispense on success.
        """
        verify_fn = app.config.get("VERIFY_DISPENSE_FN")
        if verify_fn is None:
            return jsonify({
                "status": "error",
                "error": "Verify-and-dispense is not available on this hub",
            }), 503

        body = request.get_json(silent=True) or {}
        raw_user_id = body.get("user_id")
        raw_schedule_id = body.get("schedule_id")
        auth_mode = body.get("auth_mode", "face")

        if auth_mode not in ("face", "voice"):
            return jsonify({"status": "error", "error": "Invalid auth_mode"}), 400
        if auth_mode == "voice" and not _voice_enabled():
            return jsonify({"status": "error", "error": "Voice auth disabled"}), 503
        if raw_user_id is None:
            return jsonify({"status": "error", "error": "user_id required"}), 400

        try:
            user_id = int(raw_user_id)
        except (TypeError, ValueError):
            return jsonify({"status": "error", "error": "user_id must be an integer"}), 400

        schedule_id = None
        if raw_schedule_id is not None:
            try:
                schedule_id = int(raw_schedule_id)
            except (TypeError, ValueError):
                return jsonify({"status": "error", "error": "schedule_id must be an integer"}), 400

        try:
            result = verify_fn(user_id, schedule_id, auth_mode)
        except Exception as e:
            logger.exception("dispense/verify failed: %s", e)
            return jsonify({"status": "error", "error": "Verification failed on hub"}), 500

        http_status = int(result.get("http_status") or (200 if result.get("ok") else 400))
        payload = {
            "accepted": bool(result.get("ok")),
            "result": result.get("result"),
            "dispensed": bool(result.get("dispensed")),
            "confidence": result.get("confidence"),
            "auth_mode": result.get("auth_mode", auth_mode),
            "medication_name": result.get("medication_name"),
            "schedule_id": schedule_id,
        }
        if result.get("error"):
            if result.get("ok"):
                payload["warning"] = result["error"]
            else:
                return jsonify({"status": "error", "error": result["error"], "data": payload}), http_status

        return jsonify({"status": "success", "data": payload}), http_status

    # ── Schedule Endpoints (FR-20) ───────────────────────────

    @app.route("/schedules", methods=["GET"])
    @require_auth
    def get_schedules():
        user_id = request.args.get("user_id", type=int)
        schedules = db.get_active_schedules(user_id)
        return jsonify({"status": "success", "data": schedules}), 200

    @app.route("/schedules", methods=["POST"])
    @require_auth
    def create_schedule():
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "JSON body required"}), 400
        required = ["user_id", "medication_name", "dose_time"]
        for field in required:
            if field not in data:
                return jsonify({"status": "error",
                                "error": f"Missing field: {field}"}), 400
        try:
            sid = db.create_schedule(
                int(data["user_id"]),
                data["medication_name"],
                data["dose_time"],
                slot_index=int(data.get("slot_index", 0)),
                dosage=data.get("dosage"),
                pills_per_dose=int(data.get("pills_per_dose", 1)),
                repeat_days=data.get("repeat_days"),
            )
            return jsonify({"status": "success",
                            "data": {"schedule_id": sid}}), 201
        except Exception as e:
            return jsonify({"status": "error", "error": str(e)}), 400

    @app.route("/schedules/<int:schedule_id>", methods=["PUT"])
    @require_auth
    def update_schedule(schedule_id):
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "JSON body required"}), 400
        success = db.update_schedule(schedule_id, **data)
        if success:
            return jsonify({"status": "success",
                            "data": db.get_schedule(schedule_id)}), 200
        return jsonify({"status": "error", "error": "Update failed"}), 400

    @app.route("/schedules/<int:schedule_id>", methods=["DELETE"])
    @require_auth
    def delete_schedule(schedule_id):
        success = db.delete_schedule(schedule_id)
        if success:
            return jsonify({"status": "success",
                            "data": {"deleted": schedule_id}}), 200
        return jsonify({"status": "error", "error": "Schedule not found"}), 404

    # ── Adherence Log Endpoints (FR-21) ──────────────────────

    @app.route("/adherence", methods=["GET"])
    @require_auth
    def get_adherence():
        user_id = request.args.get("user_id", type=int)
        date = request.args.get("date")  # YYYY-MM-DD format
        logs = db.get_adherence_logs(user_id, date)
        return jsonify({"status": "success", "data": logs}), 200

    @app.route("/adherence/<int:log_id>/ack", methods=["POST"])
    @require_auth
    def acknowledge_event(log_id):
        """Caregiver acknowledges a missed-dose alert (FR-35)."""
        success = db.acknowledge_event(log_id)
        if success:
            return jsonify({"status": "success",
                            "data": {"acknowledged": log_id}}), 200
        return jsonify({"status": "error", "error": "Event not found"}), 404

    # ── Inventory Endpoints ──────────────────────────────────

    @app.route("/inventory", methods=["GET"])
    @require_auth
    def get_inventory():
        compartment = request.args.get("compartment_index", type=int)
        return jsonify({"status": "success",
                        "data": db.get_inventory(compartment)}), 200

    @app.route("/inventory", methods=["POST"])
    @require_auth
    def set_inventory():
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "JSON body required"}), 400
        required = ["compartment_index", "slot_index", "pill_count"]
        for field in required:
            if field not in data:
                return jsonify({"status": "error",
                                "error": f"Missing field: {field}"}), 400
        try:
            db.upsert_inventory(
                int(data["compartment_index"]),
                int(data["slot_index"]),
                int(data["pill_count"]),
                medication_name=data.get("medication_name"),
                low_threshold=(int(data["low_threshold"])
                               if data.get("low_threshold") is not None else None),
                user_id=data.get("user_id"),
            )
            return jsonify({"status": "success", "data": {"updated": True}}), 200
        except Exception as e:
            return jsonify({"status": "error", "error": str(e)}), 400

    @app.route("/inventory/low", methods=["GET"])
    @require_auth
    def get_low_inventory():
        return jsonify({"status": "success",
                        "data": db.get_low_inventory()}), 200

    # ── Notification (event feed) Endpoints ──────────────────

    @app.route("/notifications", methods=["GET"])
    @require_auth
    def get_notifications():
        user_id = request.args.get("user_id", type=int)
        unread_only = request.args.get("unread", "").lower() in ("1", "true", "yes")
        return jsonify({"status": "success",
                        "data": db.get_notifications(user_id, unread_only)}), 200

    @app.route("/notifications/<int:notification_id>/read", methods=["POST"])
    @require_auth
    def mark_notification_read(notification_id):
        success = db.mark_notification_read(notification_id)
        if success:
            return jsonify({"status": "success",
                            "data": {"read": notification_id}}), 200
        return jsonify({"status": "error", "error": "Notification not found"}), 404

    return app

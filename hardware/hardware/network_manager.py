"""
PillSafe — Wi-Fi / hotspot control via NetworkManager (nmcli).

Used by the mobile Device Connection screen to switch the Pi between:
  - hotspot mode (PillSafe-AP) for first-time setup
  - client mode (join a known home / phone Wi-Fi)

Requires NetworkManager and permission to run nmcli (see
scripts/install_nmcli_sudoers.sh).
"""

from __future__ import annotations

import re
import shutil
import subprocess
import time
from typing import Any

from utils.config import get_config
from utils.logger import setup_logger

logger = setup_logger("pillsafe.network")

HOTSPOT_CON_NAME = "PillSafe-AP"


def _cfg_hotspot() -> dict[str, Any]:
    cfg = get_config()
    hs = getattr(cfg, "hotspot", None)
    if hs is None:
        return {
            "ssid": "PillSafe-AP",
            "password": "pillsafe2026",
            "api_url": "http://10.42.0.1:5000",
        }
    ssid = str(getattr(hs, "ssid", "PillSafe-AP") or "PillSafe-AP")
    password = str(getattr(hs, "password", "pillsafe2026") or "pillsafe2026")
    # NetworkManager "shared" AP typically lands on 10.42.0.1
    api_url = str(
        getattr(hs, "api_url", "") or "http://10.42.0.1:5000"
    ).rstrip("/")
    return {"ssid": ssid, "password": password, "api_url": api_url}


def _nmcli_bin() -> str | None:
    return shutil.which("nmcli")


def _run(args: list[str], *, timeout: float = 60) -> tuple[int, str, str]:
    """Run nmcli, preferring sudo -n when available for system connections."""
    nmcli = _nmcli_bin()
    if not nmcli:
        return 127, "", "nmcli not found — install NetworkManager"

    attempts = [
        ["sudo", "-n", nmcli, *args],
        [nmcli, *args],
    ]
    last = (1, "", "nmcli failed")
    for cmd in attempts:
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
            out = (proc.stdout or "").strip()
            err = (proc.stderr or "").strip()
            last = (proc.returncode, out, err)
            if proc.returncode == 0:
                return last
            # sudo -n fails when password required — try without sudo
            if cmd[0] == "sudo" and (
                "password" in err.lower() or proc.returncode == 1
            ):
                continue
        except FileNotFoundError:
            continue
        except subprocess.TimeoutExpired:
            return 124, "", "nmcli timed out"
    return last


def available() -> bool:
    return _nmcli_bin() is not None


def _ipv4_addresses() -> list[str]:
    code, out, _ = _run(["-g", "IP4.ADDRESS", "device", "show", "wlan0"])
    if code != 0 or not out:
        code, out, _ = _run(["-g", "IP4.ADDRESS", "device", "show"])
    addrs: list[str] = []
    for line in (out or "").splitlines():
        # e.g. 10.42.0.1/24
        m = re.match(r"(\d+\.\d+\.\d+\.\d+)", line.strip())
        if m:
            addrs.append(m.group(1))
    return addrs


def _active_connection() -> str | None:
    code, out, _ = _run(
        ["-t", "-f", "NAME,DEVICE,TYPE", "connection", "show", "--active"]
    )
    if code != 0:
        return None
    for line in (out or "").splitlines():
        parts = line.split(":")
        if len(parts) >= 2 and parts[1] == "wlan0":
            return parts[0]
    return None


def _wifi_ssid() -> str | None:
    code, out, _ = _run(["-t", "-f", "ACTIVE,SSID", "device", "wifi", "list"])
    if code != 0:
        return None
    for line in (out or "").splitlines():
        # ACTIVE:SSID  — active is "yes"
        if line.lower().startswith("yes:"):
            return line.split(":", 1)[1] or None
    return None


def status() -> dict[str, Any]:
    hs = _cfg_hotspot()
    active = _active_connection()
    mode = "hotspot" if active == HOTSPOT_CON_NAME else "wifi"
    if active is None:
        mode = "unknown"
    addrs = _ipv4_addresses()
    primary = addrs[0] if addrs else None
    api_urls = [f"http://{a}:5000" for a in addrs]
    if mode == "hotspot" and hs["api_url"] not in api_urls:
        api_urls.insert(0, hs["api_url"])
    return {
        "available": available(),
        "mode": mode,
        "connection": active,
        "ssid": _wifi_ssid() if mode == "wifi" else hs["ssid"],
        "hotspot_ssid": hs["ssid"],
        "ipv4": addrs,
        "primary_ipv4": primary,
        "api_urls": api_urls,
        "recommended_api_url": (
            hs["api_url"] if mode == "hotspot"
            else (api_urls[0] if api_urls else None)
        ),
    }


def _ensure_hotspot_connection(ssid: str, password: str) -> tuple[bool, str]:
    code, out, err = _run(["-t", "-f", "NAME", "connection", "show"])
    names = {line.strip() for line in (out or "").splitlines() if line.strip()}
    if HOTSPOT_CON_NAME not in names:
        code, out, err = _run([
            "connection", "add",
            "type", "wifi",
            "ifname", "wlan0",
            "con-name", HOTSPOT_CON_NAME,
            "autoconnect", "yes",
            "ssid", ssid,
        ])
        if code != 0:
            return False, err or out or "failed to create hotspot connection"

    mods = [
        ["connection", "modify", HOTSPOT_CON_NAME,
         "802-11-wireless.mode", "ap",
         "802-11-wireless.band", "bg",
         "ipv4.method", "shared"],
        ["connection", "modify", HOTSPOT_CON_NAME,
         "wifi-sec.key-mgmt", "wpa-psk",
         "wifi-sec.psk", password],
        ["connection", "modify", HOTSPOT_CON_NAME,
         "connection.autoconnect", "yes",
         "connection.autoconnect-priority", "100"],
        ["connection", "modify", HOTSPOT_CON_NAME,
         "802-11-wireless.ssid", ssid],
    ]
    for args in mods:
        code, out, err = _run(args)
        if code != 0:
            return False, err or out or f"nmcli modify failed: {args}"
    return True, "ok"


def enable_hotspot() -> dict[str, Any]:
    if not available():
        raise RuntimeError("NetworkManager (nmcli) is not available on this hub")

    hs = _cfg_hotspot()
    ok, msg = _ensure_hotspot_connection(hs["ssid"], hs["password"])
    if not ok:
        raise RuntimeError(msg)

    # Lower priority / disconnect other Wi‑Fi so AP can claim wlan0
    code, out, _ = _run(["-t", "-f", "NAME,TYPE", "connection", "show"])
    for line in (out or "").splitlines():
        parts = line.split(":")
        if len(parts) >= 2 and parts[1] == "802-11-wireless" and parts[0] != HOTSPOT_CON_NAME:
            _run([
                "connection", "modify", parts[0],
                "connection.autoconnect", "no",
            ])
            _run(["connection", "down", parts[0]])

    code, out, err = _run(["connection", "up", HOTSPOT_CON_NAME], timeout=90)
    if code != 0:
        raise RuntimeError(err or out or "failed to start PillSafe-AP")

    time.sleep(2)
    st = status()
    st["message"] = (
        f"Hotspot '{hs['ssid']}' is up. Join it on your phone, then use "
        f"{st.get('recommended_api_url') or hs['api_url']}"
    )
    return st


def join_wifi(ssid: str, password: str) -> dict[str, Any]:
    if not available():
        raise RuntimeError("NetworkManager (nmcli) is not available on this hub")

    ssid = str(ssid or "").strip()
    password = str(password or "")
    if not ssid:
        raise ValueError("Wi-Fi name (SSID) is required")
    if len(password) < 8:
        raise ValueError("Wi-Fi password must be at least 8 characters")

    # Prefer hotspot fallback if join fails later
    _run([
        "connection", "modify", HOTSPOT_CON_NAME,
        "connection.autoconnect", "yes",
        "connection.autoconnect-priority", "10",
    ])

    # Bring hotspot down so client can use wlan0
    _run(["connection", "down", HOTSPOT_CON_NAME])

    con_name = f"PillSafe-WiFi-{ssid}"[:120]
    # Delete prior connection with same name (ignore errors)
    _run(["connection", "delete", con_name])

    code, out, err = _run([
        "device", "wifi", "connect", ssid,
        "password", password,
        "ifname", "wlan0",
        "name", con_name,
    ], timeout=90)
    if code != 0:
        # Try to restore hotspot so the phone can reconnect
        try:
            enable_hotspot()
        except Exception as restore_exc:
            logger.error("Failed to restore hotspot after Wi-Fi join error: %s", restore_exc)
        raise RuntimeError(err or out or f"Could not join Wi-Fi '{ssid}'")

    _run([
        "connection", "modify", con_name,
        "connection.autoconnect", "yes",
        "connection.autoconnect-priority", "200",
    ])
    # Keep hotspot as low-priority fallback, not auto-preferred
    _run([
        "connection", "modify", HOTSPOT_CON_NAME,
        "connection.autoconnect", "yes",
        "connection.autoconnect-priority", "5",
    ])

    time.sleep(2)
    st = status()
    st["message"] = (
        f"Joined Wi-Fi '{ssid}'. On your phone, leave PillSafe-AP and join "
        f"the same network, then reconnect to the hub"
        + (f" at {st['recommended_api_url']}" if st.get("recommended_api_url") else "")
        + "."
    )
    return st

"""
PillSafe — Africa's Talking SMS client (hub primary path).

Live:    https://api.africastalking.com/version1/messaging
Sandbox: https://api.sandbox.africastalking.com/version1/messaging

Credentials come from config.yaml alerts.africas_talking (developer-only).
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from utils.config import get_config
from utils.logger import setup_logger

logger = setup_logger("pillsafe.at")

LIVE_BASE = "https://api.africastalking.com"
SANDBOX_BASE = "https://api.sandbox.africastalking.com"


class AfricasTalkingSMS:
    """Thin REST wrapper for caregiver SMS from the Raspberry Pi hub."""

    def __init__(self) -> None:
        cfg = get_config()
        alerts = getattr(cfg, "alerts", None)
        at = getattr(alerts, "africas_talking", None) if alerts else None
        if at is None:
            at = {}

        self.username = str(getattr(at, "username", "") or "").strip()
        self.api_key = str(getattr(at, "api_key", "") or "").strip()
        self.sender_id = str(getattr(at, "sender_id", "") or "").strip()
        # Default live so real phones can receive; set sandbox: true for Simulator only.
        sandbox_raw = getattr(at, "sandbox", False)
        if isinstance(sandbox_raw, str):
            self.sandbox = sandbox_raw.strip().lower() in ("1", "true", "yes")
        else:
            self.sandbox = bool(sandbox_raw)
        self.timeout = float(getattr(at, "timeout_seconds", 15) or 15)

    def is_configured(self) -> bool:
        key = self.api_key
        return bool(
            self.username
            and key
            and not key.startswith("REPLACE_WITH_")
        )

    def send_sms(self, phone_number: str, message: str) -> bool:
        """
        Send SMS via Africa's Talking. Returns True if the API accepted the
        recipient (Success / Sent / statusCode < 400).
        """
        phone = str(phone_number or "").strip()
        body = str(message or "").strip()
        if not self.is_configured():
            logger.warning(
                "Africa's Talking not configured "
                "(set alerts.africas_talking username + api_key)"
            )
            return False
        if not phone or not body:
            logger.warning("Africa's Talking SMS missing to/body")
            return False

        base = SANDBOX_BASE if self.sandbox else LIVE_BASE
        url = f"{base}/version1/messaging"
        fields: dict[str, str] = {
            "username": self.username,
            "to": phone,
            "message": body,
        }
        if self.sender_id:
            fields["from"] = self.sender_id

        data = urllib.parse.urlencode(fields).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            method="POST",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "apiKey": self.api_key,
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                text = resp.read().decode("utf-8", errors="replace")
                status_code = getattr(resp, "status", 200)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")[:300]
            logger.error(
                "Africa's Talking HTTP %s to %s: %s",
                e.code, phone, err_body,
            )
            return False
        except Exception as e:
            logger.error("Africa's Talking request failed to %s: %s", phone, e)
            return False

        raw: Any
        try:
            raw = json.loads(text)
        except json.JSONDecodeError:
            raw = {"raw": text}

        if status_code >= 400:
            logger.error(
                "Africa's Talking HTTP %s to %s: %s",
                status_code, phone, text[:200],
            )
            return False

        recipients = (
            (raw or {}).get("SMSMessageData", {}) or {}
        ).get("Recipients")
        if isinstance(recipients, list) and recipients:
            first = recipients[0] or {}
            status = str(first.get("status") or "")
            code = first.get("statusCode")
            try:
                code_ok = code is not None and int(code) < 400
            except (TypeError, ValueError):
                code_ok = False
            ok = bool(
                status and (
                    "success" in status.lower()
                    or "sent" in status.lower()
                    or code_ok
                )
            )
            if ok:
                logger.info(
                    "Africa's Talking SMS to %s: %s (sandbox=%s)",
                    phone, status or "OK", self.sandbox,
                )
                return True
            logger.error(
                "Africa's Talking rejected %s: %s",
                phone, status or first,
            )
            return False

        logger.info(
            "Africa's Talking SMS to %s accepted (no recipient detail, sandbox=%s)",
            phone, self.sandbox,
        )
        return True

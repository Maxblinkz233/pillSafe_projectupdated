/**
 * Africa's Talking SMS from the phone (GSM fallback path).
 * Requires phone internet (mobile data). Credentials are demo-stored in AsyncStorage.
 *
 * Live:  https://api.africastalking.com/version1/messaging
 * Sandbox: https://api.sandbox.africastalking.com/version1/messaging
 */

function formEncode(fields) {
  return Object.entries(fields)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join('&');
}

/**
 * @param {{ username: string, apiKey: string, to: string, message: string, senderId?: string, sandbox?: boolean }} opts
 * @returns {Promise<{ ok: boolean, raw?: any, error?: string }>}
 */
export async function sendAfricasTalkingSms({
  username,
  apiKey,
  to,
  message,
  senderId,
  sandbox = true,
}) {
  const user = String(username || '').trim();
  const key = String(apiKey || '').trim();
  const phone = String(to || '').trim();
  const body = String(message || '').trim();

  if (!user || !key) {
    return {ok: false, error: 'Africa’s Talking username/apiKey not configured'};
  }
  if (!phone || !body) {
    return {ok: false, error: 'Missing SMS to/body'};
  }

  const base = sandbox
    ? 'https://api.sandbox.africastalking.com'
    : 'https://api.africastalking.com';
  const url = `${base}/version1/messaging`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: key,
      },
      body: formEncode({
        username: user,
        to: phone,
        message: body,
        ...(senderId ? {from: senderId} : {}),
      }),
    });
    const text = await res.text();
    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = {raw: text};
    }
    if (!res.ok) {
      return {
        ok: false,
        raw,
        error: `Africa’s Talking HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    // Recipients status: Success / Sent is good enough for demo
    const recipients = raw?.SMSMessageData?.Recipients;
    if (Array.isArray(recipients) && recipients.length) {
      const status = String(recipients[0].status || '');
      const ok =
        /success|sent/i.test(status) || Number(recipients[0].statusCode) < 400;
      return ok
        ? {ok: true, raw}
        : {ok: false, raw, error: status || 'SMS not accepted'};
    }
    return {ok: true, raw};
  } catch (err) {
    return {
      ok: false,
      error: err?.message || String(err),
    };
  }
}

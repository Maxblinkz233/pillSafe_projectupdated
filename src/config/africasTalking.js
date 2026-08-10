/**
 * PillSafe Africa’s Talking credentials (developer / service config).
 *
 * End users never see or type these. Fill in before building the app so the
 * phone can send caregiver SMS when hub GSM fails.
 *
 * Sandbox: username is usually "sandbox"; whitelist test numbers in the AT dashboard.
 * Live: use your production username, API key, and approved sender ID.
 */
export const AFRICAS_TALKING = {
  username: 'sandbox',
  apiKey: 'atsk_a3d2b40a496b41ab81303d5019cad26d4c37a14969758fc5bc2ebb4be0bf80a7b9c1433e',
  /** Optional approved alphanumeric sender; leave '' for default */
  senderId: '',
  /** true = sandbox API host; false = live api.africastalking.com */
  sandbox: true,
};

export function isAfricasTalkingConfigured() {
  const key = String(AFRICAS_TALKING.apiKey || '').trim();
  return (
    Boolean(String(AFRICAS_TALKING.username || '').trim()) &&
    key.length > 0 &&
    !key.startsWith('REPLACE_WITH_')
  );
}

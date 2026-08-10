import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  baseUrl: '@pillsafe/api_base_url',
  token: '@pillsafe/api_token',
  userId: '@pillsafe/user_id',
  userName: '@pillsafe/user_name',
  caregiverName: '@pillsafe/caregiver_name',
  caregiverPhone: '@pillsafe/caregiver_phone',
  signedIn: '@pillsafe/signed_in',
  networkMode: '@pillsafe/network_mode',
};

/** Default while phone is on PillSafe-AP (NetworkManager shared hotspot). */
export const HOTSPOT_BASE_URL = 'http://10.42.0.1:5000';
export const HOTSPOT_SSID = 'PillSafe-AP';
export const DEFAULT_BASE_URL = HOTSPOT_BASE_URL;
export const DEFAULT_TOKEN = 'pillsafe';

export function getApiBaseUrlCandidates(baseUrl = DEFAULT_BASE_URL) {
  const normalized = String(baseUrl || '').trim().replace(/\/$/, '');
  const seen = new Set();
  const candidates = [];

  const addCandidate = value => {
    if (!value) return;
    const normalizedValue = String(value).trim().replace(/\/$/, '');
    if (!normalizedValue || seen.has(normalizedValue)) return;
    seen.add(normalizedValue);
    candidates.push(normalizedValue);
  };

  addCandidate(normalized);
  addCandidate(HOTSPOT_BASE_URL);
  addCandidate('http://192.168.4.1:5000');
  addCandidate('http://172.20.10.4:5000');
  addCandidate('http://10.0.2.2:5000');
  addCandidate('http://localhost:5000');

  return candidates;
}

export async function getApiConfig() {
  const rows = await AsyncStorage.multiGet([
    KEYS.baseUrl,
    KEYS.token,
    KEYS.userId,
    KEYS.userName,
    KEYS.caregiverName,
    KEYS.caregiverPhone,
    KEYS.signedIn,
    KEYS.networkMode,
  ]);
  const map = Object.fromEntries(rows);

  return {
    baseUrl: (map[KEYS.baseUrl] || DEFAULT_BASE_URL).replace(/\/$/, ''),
    token: map[KEYS.token] || DEFAULT_TOKEN,
    userId: map[KEYS.userId] ? Number(map[KEYS.userId]) : null,
    userName: map[KEYS.userName] || null,
    caregiverName: map[KEYS.caregiverName] || null,
    caregiverPhone: map[KEYS.caregiverPhone] || null,
    signedIn: map[KEYS.signedIn] === '1',
    networkMode: map[KEYS.networkMode] === 'wifi' ? 'wifi' : 'hotspot',
  };
}

export async function saveApiConfig(fields = {}) {
  const pairs = [];
  const put = (key, value) => {
    if (value === undefined) return;
    pairs.push([key, value == null ? '' : String(value)]);
  };

  if (fields.baseUrl != null) {
    put(KEYS.baseUrl, String(fields.baseUrl).replace(/\/$/, ''));
  }
  if (fields.token != null) put(KEYS.token, fields.token);
  if (fields.userId != null) put(KEYS.userId, fields.userId);
  if (fields.userName != null) put(KEYS.userName, fields.userName);
  if (fields.caregiverName != null) put(KEYS.caregiverName, fields.caregiverName);
  if (fields.caregiverPhone != null) {
    put(KEYS.caregiverPhone, fields.caregiverPhone);
  }
  if (fields.signedIn != null) {
    put(KEYS.signedIn, fields.signedIn ? '1' : '0');
  }
  if (fields.networkMode != null) {
    put(KEYS.networkMode, fields.networkMode);
  }

  if (pairs.length) {
    await AsyncStorage.multiSet(pairs);
  }
}

export async function clearSessionUser() {
  await AsyncStorage.multiRemove([
    KEYS.userId,
    KEYS.userName,
    KEYS.caregiverName,
    KEYS.caregiverPhone,
    KEYS.signedIn,
  ]);
}

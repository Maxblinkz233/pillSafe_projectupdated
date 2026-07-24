import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  baseUrl: '@pillsafe/api_base_url',
  token: '@pillsafe/api_token',
  userId: '@pillsafe/user_id',
  userName: '@pillsafe/user_name',
};

export const DEFAULT_BASE_URL = 'http://10.0.2.2:5000';
export const DEFAULT_TOKEN = 'CHANGE_ME_ON_FIRST_SETUP';

export function getApiBaseUrlCandidates(baseUrl = DEFAULT_BASE_URL) {
  const normalized = String(baseUrl || '').trim().replace(/\/$/, '');
  const seen = new Set();
  const candidates = [];

  const addCandidate = (value) => {
    if (!value) return;
    const normalizedValue = String(value).trim().replace(/\/$/, '');
    if (!normalizedValue || seen.has(normalizedValue)) return;
    seen.add(normalizedValue);
    candidates.push(normalizedValue);
  };

  addCandidate(normalized);
  addCandidate('http://10.0.2.2:5000');
  addCandidate('http://192.168.4.1:5000');
  addCandidate('http://localhost:5000');

  return candidates;
}

export async function getApiConfig() {
  const [baseUrl, token, userId, userName] = await AsyncStorage.multiGet([
    KEYS.baseUrl,
    KEYS.token,
    KEYS.userId,
    KEYS.userName,
  ]);

  return {
    baseUrl: (baseUrl[1] || DEFAULT_BASE_URL).replace(/\/$/, ''),
    token: token[1] || DEFAULT_TOKEN,
    userId: userId[1] ? Number(userId[1]) : null,
    userName: userName[1] || null,
  };
}

export async function saveApiConfig({baseUrl, token, userId, userName}) {
  const pairs = [];
  if (baseUrl != null) {
    pairs.push([KEYS.baseUrl, String(baseUrl).replace(/\/$/, '')]);
  }
  if (token != null) {
    pairs.push([KEYS.token, String(token)]);
  }
  if (userId != null) {
    pairs.push([KEYS.userId, String(userId)]);
  }
  if (userName != null) {
    pairs.push([KEYS.userName, String(userName)]);
  }
  if (pairs.length) {
    await AsyncStorage.multiSet(pairs);
  }
}

export async function clearSessionUser() {
  await AsyncStorage.multiRemove([KEYS.userId, KEYS.userName]);
}

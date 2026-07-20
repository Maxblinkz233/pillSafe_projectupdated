import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  baseUrl: '@pillsafe/api_base_url',
  token: '@pillsafe/api_token',
  userId: '@pillsafe/user_id',
  userName: '@pillsafe/user_name',
  caregiverName: '@pillsafe/caregiver_name',
  caregiverPhone: '@pillsafe/caregiver_phone',
  signedIn: '@pillsafe/signed_in',
};

export const DEFAULT_BASE_URL = 'http://192.168.4.1:5000';
export const DEFAULT_TOKEN = 'CHANGE_ME_ON_FIRST_SETUP';

/**
 * Prefer single-key getItem/setItem/removeItem.
 * AsyncStorage v3 renamed multiGet→getMany / multiSet→setMany / multiRemove→removeMany,
 * and some installs leave the old multi* methods undefined ("undefined is not a function").
 */
export async function getApiConfig() {
  const [
    baseUrl,
    token,
    userId,
    userName,
    caregiverName,
    caregiverPhone,
    signedIn,
  ] = await Promise.all([
    AsyncStorage.getItem(KEYS.baseUrl),
    AsyncStorage.getItem(KEYS.token),
    AsyncStorage.getItem(KEYS.userId),
    AsyncStorage.getItem(KEYS.userName),
    AsyncStorage.getItem(KEYS.caregiverName),
    AsyncStorage.getItem(KEYS.caregiverPhone),
    AsyncStorage.getItem(KEYS.signedIn),
  ]);

  return {
    baseUrl: (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, ''),
    token: token || DEFAULT_TOKEN,
    userId: userId ? Number(userId) : null,
    userName: userName || null,
    caregiverName: caregiverName || null,
    caregiverPhone: caregiverPhone || null,
    signedIn: signedIn === '1',
  };
}

export async function saveApiConfig({
  baseUrl,
  token,
  userId,
  userName,
  caregiverName,
  caregiverPhone,
  signedIn,
}) {
  const ops = [];
  if (baseUrl != null) {
    ops.push(
      AsyncStorage.setItem(KEYS.baseUrl, String(baseUrl).replace(/\/$/, '')),
    );
  }
  if (token != null) {
    ops.push(AsyncStorage.setItem(KEYS.token, String(token)));
  }
  if (userId != null) {
    ops.push(AsyncStorage.setItem(KEYS.userId, String(userId)));
  }
  if (userName != null) {
    ops.push(AsyncStorage.setItem(KEYS.userName, String(userName)));
  }
  if (caregiverName != null) {
    ops.push(AsyncStorage.setItem(KEYS.caregiverName, String(caregiverName)));
  }
  if (caregiverPhone != null) {
    ops.push(AsyncStorage.setItem(KEYS.caregiverPhone, String(caregiverPhone)));
  }
  if (signedIn != null) {
    ops.push(AsyncStorage.setItem(KEYS.signedIn, signedIn ? '1' : '0'));
  }
  if (ops.length) {
    await Promise.all(ops);
  }
}

export async function clearSessionUser() {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.userId),
    AsyncStorage.removeItem(KEYS.userName),
    AsyncStorage.removeItem(KEYS.caregiverName),
    AsyncStorage.removeItem(KEYS.caregiverPhone),
    AsyncStorage.removeItem(KEYS.signedIn),
  ]);
}

export async function signOutLocal() {
  await clearSessionUser();
}

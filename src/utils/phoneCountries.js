/**
 * Country dial codes and national number lengths for caregiver phone entry.
 * Ghana (+233) is the default: exactly 9 digits after the country code.
 */

export const PHONE_COUNTRIES = [
  {code: 'GH', name: 'Ghana', dial: '233', nationalLength: 9, flag: '🇬🇭'},
  {code: 'NG', name: 'Nigeria', dial: '234', nationalLength: 10, flag: '🇳🇬'},
  {code: 'KE', name: 'Kenya', dial: '254', nationalLength: 9, flag: '🇰🇪'},
  {code: 'ZA', name: 'South Africa', dial: '27', nationalLength: 9, flag: '🇿🇦'},
  {code: 'CI', name: "Côte d'Ivoire", dial: '225', nationalLength: 10, flag: '🇨🇮'},
  {code: 'TG', name: 'Togo', dial: '228', nationalLength: 8, flag: '🇹🇬'},
  {code: 'BF', name: 'Burkina Faso', dial: '226', nationalLength: 8, flag: '🇧🇫'},
  {code: 'GB', name: 'United Kingdom', dial: '44', nationalLength: 10, flag: '🇬🇧'},
  {code: 'US', name: 'United States', dial: '1', nationalLength: 10, flag: '🇺🇸'},
  {code: 'CA', name: 'Canada', dial: '1', nationalLength: 10, flag: '🇨🇦'},
  {code: 'IN', name: 'India', dial: '91', nationalLength: 10, flag: '🇮🇳'},
  {code: 'AE', name: 'United Arab Emirates', dial: '971', nationalLength: 9, flag: '🇦🇪'},
];

export const DEFAULT_PHONE_COUNTRY =
  PHONE_COUNTRIES.find(c => c.code === 'GH') || PHONE_COUNTRIES[0];

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export function findCountryByDial(dialCode) {
  const dial = digitsOnly(dialCode);
  // Prefer longer dial matches first (e.g. 233 before 23)
  const sorted = [...PHONE_COUNTRIES].sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  return sorted.find(c => dial === c.dial || dial.startsWith(c.dial)) || null;
}

/**
 * Split a stored E.164 / local number into country + national digits.
 */
export function parseStoredPhone(raw) {
  const digits = digitsOnly(raw);
  if (!digits) {
    return {
      country: DEFAULT_PHONE_COUNTRY,
      national: '',
    };
  }

  // Prefer Ghana if number looks like local 0XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) {
    return {
      country: DEFAULT_PHONE_COUNTRY,
      national: digits.slice(1, 1 + DEFAULT_PHONE_COUNTRY.nationalLength),
    };
  }

  const sorted = [...PHONE_COUNTRIES].sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  for (const country of sorted) {
    if (digits.startsWith(country.dial)) {
      const national = digits.slice(country.dial.length).slice(0, country.nationalLength);
      return {country, national};
    }
  }

  return {
    country: DEFAULT_PHONE_COUNTRY,
    national: digits.slice(0, DEFAULT_PHONE_COUNTRY.nationalLength),
  };
}

export function formatE164(country, nationalDigits) {
  const national = digitsOnly(nationalDigits).slice(0, country.nationalLength);
  return `+${country.dial}${national}`;
}

/**
 * Strict validation: national part must be exactly country.nationalLength digits.
 * @returns {{ ok: boolean, e164?: string, error?: string }}
 */
export function validateCaregiverPhone(country, nationalDigits) {
  const national = digitsOnly(nationalDigits);
  const expected = country?.nationalLength;
  if (!country || !expected) {
    return {ok: false, error: 'Select a country for the phone number.'};
  }
  if (!national) {
    return {
      ok: false,
      error: `Enter the ${expected}-digit local number after +${country.dial}.`,
    };
  }
  if (national.length !== expected) {
    return {
      ok: false,
      error: `${country.name} numbers need exactly ${expected} digits after +${country.dial} (you entered ${national.length}).`,
    };
  }
  // Ghana mobiles: do not allow a leading 0 in the national part
  if (country.code === 'GH' && national.startsWith('0')) {
    return {
      ok: false,
      error: 'Do not include a leading 0. Example: 598833244 after +233.',
    };
  }
  return {ok: true, e164: formatE164(country, national)};
}

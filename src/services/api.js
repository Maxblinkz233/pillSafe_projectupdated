import { getApiConfig } from './config';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const { baseUrl, token } = await getApiConfig();
  let url = `${baseUrl}${path}`;

  if (query) {
    const parts = [];
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
        );
      }
    });
    if (parts.length) {
      url += `?${parts.join('&')}`;
    }
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      `Cannot reach PillSafe at ${baseUrl}. Check Wi-Fi and Device Connection settings.`,
      0,
      { error: String(err) },
    );
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

export const api = {
  health: () => request('/health'),

  getUsers: () => request('/users'),

  login: ({ fullName, password }) =>
    request('/auth/login', {
      method: 'POST',
      body: { full_name: fullName, password },
    }),

  claimAccount: ({ fullName, caregiverName, caregiverPhone, password }) =>
    request('/auth/claim', {
      method: 'POST',
      body: {
        full_name: fullName,
        caregiver_name: caregiverName,
        caregiver_phone: caregiverPhone,
        password,
      },
    }),

  createUser: ({
    fullName,
    password,
    caregiverName,
    caregiverPhone,
    compartmentIndex,
  }) =>
    request('/users', {
      method: 'POST',
      body: {
        full_name: fullName,
        password,
        caregiver_name: caregiverName,
        caregiver_phone: caregiverPhone,
        compartment_index: compartmentIndex,
      },
    }),

  updateUser: (userId, fields) =>
    request(`/users/${userId}`, {
      method: 'PUT',
      body: fields,
    }),

  enrolFace: userId => request(`/users/${userId}/enrol`, { method: 'POST' }),

  enrolVoice: userId =>
    request(`/users/${userId}/enrol/voice`, { method: 'POST' }),

  createSchedule: ({
    userId,
    medicationName,
    doseTime,
    slotIndex = 0,
    dosage,
    pillsPerDose = 1,
    repeatDays,
  }) =>
    request('/schedules', {
      method: 'POST',
      body: {
        user_id: userId,
        medication_name: medicationName,
        dose_time: doseTime,
        slot_index: slotIndex,
        ...(dosage != null && dosage !== '' ? { dosage } : {}),
        pills_per_dose: pillsPerDose,
        ...(repeatDays != null && repeatDays !== ''
          ? { repeat_days: repeatDays }
          : {}),
      },
    }),

  getSchedules: userId =>
    request('/schedules', { query: userId != null ? { user_id: userId } : {} }),

  getAdherence: (userId, date) =>
    request('/adherence', {
      query: {
        ...(userId != null ? { user_id: userId } : {}),
        ...(date ? { date } : {}),
      },
    }),

  getNotifications: (userId, unreadOnly = false) =>
    request('/notifications', {
      query: {
        ...(userId != null ? { user_id: userId } : {}),
        ...(unreadOnly ? { unread: 'true' } : {}),
      },
    }),

  markNotificationRead: notificationId =>
    request(`/notifications/${notificationId}/read`, { method: 'POST' }),

  acknowledgeAdherence: logId =>
    request(`/adherence/${logId}/ack`, { method: 'POST' }),

  dispenseRequest: ({ userId, scheduleId, authMode = 'face' }) =>
    request('/dispense/request', {
      method: 'POST',
      body: {
        user_id: userId,
        ...(scheduleId != null ? { schedule_id: scheduleId } : {}),
        auth_mode: authMode,
      },
    }),

  getVoiceChallenge: () => request('/voice/challenge'),

  getEnrolStatus: userId => request(`/users/${userId}/enrol/status`),

  getUser: userId =>
    request(`/users`).then(
      users =>
        (users || []).find(u => Number(u.user_id) === Number(userId)) || null,
    ),

  deleteUser: userId => request(`/users/${userId}`, { method: 'DELETE' }),

  getInventory: compartmentIndex =>
    request('/inventory', {
      query:
        compartmentIndex != null ? { compartment_index: compartmentIndex } : {},
    }),
};

/** Today's date as YYYY-MM-DD in local time. */
export function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function periodForTime(hhmm) {
  if (!hhmm) return 'OTHER';
  const hour = Number(String(hhmm).split(':')[0]);
  if (Number.isNaN(hour)) return 'OTHER';
  if (hour < 12) return 'MORNING';
  if (hour < 17) return 'AFTERNOON';
  return 'EVENING';
}

export function formatRelativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(then.getTime())) return String(iso);
  const diffMs = Date.now() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function notificationTypeLabel(type) {
  switch (type) {
    case 'MISSED':
      return 'MISSED DOSE';
    case 'DISPENSED':
      return 'DOSE DISPENSED';
    case 'REJECTED':
      return 'VERIFICATION FAILED';
    case 'REMINDER':
      return 'REMINDER';
    case 'LOW_INVENTORY':
      return 'LOW INVENTORY';
    case 'MECHANICAL_ERROR':
      return 'DEVICE ALERT';
    case 'DEVICE_STATUS':
      return 'DEVICE ALERT';
    default:
      return type || 'ALERT';
  }
}

function minutesNow() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function doseTimeMinutes(hhmm) {
  const parts = String(hhmm || '00:00').split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Merge schedules with today's adherence logs into UI-friendly dose rows.
 * Past due times with no TAKEN log become overdue/missed so one late dose
 * cannot block verifying a later medication.
 */
export function buildTodayDoses(schedules, adherenceLogs, graceMinutes = 15) {
  const bySchedule = {};
  (adherenceLogs || []).forEach(log => {
    const sid = log.schedule_id;
    if (!bySchedule[sid] || log.logged_at > bySchedule[sid].logged_at) {
      bySchedule[sid] = log;
    }
  });

  const nowMins = minutesNow();

  return (schedules || []).map(sched => {
    const log = bySchedule[sched.schedule_id];
    let status = 'pending';
    let takenAt = null;
    if (log) {
      if (log.outcome === 'TAKEN') {
        status = 'taken';
        takenAt = log.actual_time || null;
      } else if (
        log.outcome === 'MISSED' ||
        log.outcome === 'REJECTED' ||
        log.outcome === 'MECHANICAL_ERROR'
      ) {
        status = 'missed';
      }
    } else {
      const due = doseTimeMinutes(sched.dose_time);
      if (nowMins > due + Number(graceMinutes || 0)) {
        status = 'missed';
      } else if (nowMins >= due) {
        status = 'due';
      } else {
        status = 'pending';
      }
    }

    const doseTime = sched.dose_time || '00:00';
    return {
      id: String(sched.schedule_id),
      scheduleId: sched.schedule_id,
      userId: sched.user_id,
      name: sched.medication_name,
      dosage: sched.dosage || '',
      category: sched.dosage || 'Medication',
      slot: `Slot ${Number(sched.slot_index ?? 0) + 1}`,
      slotIndex: sched.slot_index ?? 0,
      time: doseTime,
      period: periodForTime(doseTime),
      status,
      takenAt,
      compartmentIndex: sched.compartment_index,
      fullName: sched.full_name,
    };
  });
}

export function computeDashboardStats(doses, deviceOnline) {
  const total = doses.length;
  const taken = doses.filter(d => d.status === 'taken').length;
  const missed = doses.filter(d => d.status === 'missed').length;
  const adherence = total === 0 ? 0 : Math.round((taken / total) * 100);
  return {
    todayDoses: taken,
    totalDoses: total,
    adherence,
    missed,
    deviceStatus: deviceOnline ? 'Online' : 'Offline',
  };
}

/** Doses the patient can still verify (due now, upcoming, or missed/late). */
export function actionableDoses(doses) {
  return (doses || [])
    .filter(
      d =>
        d.status === 'due' || d.status === 'pending' || d.status === 'missed',
    )
    .slice()
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

/**
 * Next dispense card: prefer due-now, then soonest future pending,
 * then soonest missed (late catch-up) — never lock on one overdue forever.
 */
export function nextPendingDose(doses) {
  const list = doses || [];
  const due = list
    .filter(d => d.status === 'due')
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  if (due[0]) return due[0];

  const pending = list
    .filter(d => d.status === 'pending')
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  if (pending[0]) return pending[0];

  const missed = list
    .filter(d => d.status === 'missed')
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  return missed[0] || null;
}

export function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

import {getApiConfig} from './config';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, {method = 'GET', body, query} = {}) {
  const {baseUrl, token} = await getApiConfig();
  let url = `${baseUrl}${path}`;

  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
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
      {error: String(err)},
    );
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {raw: text};
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

  getSchedules: (userId) =>
    request('/schedules', {query: userId != null ? {user_id: userId} : {}}),

  getAdherence: (userId, date) =>
    request('/adherence', {
      query: {
        ...(userId != null ? {user_id: userId} : {}),
        ...(date ? {date} : {}),
      },
    }),

  getNotifications: (userId, unreadOnly = false) =>
    request('/notifications', {
      query: {
        ...(userId != null ? {user_id: userId} : {}),
        ...(unreadOnly ? {unread: 'true'} : {}),
      },
    }),

  markNotificationRead: (notificationId) =>
    request(`/notifications/${notificationId}/read`, {method: 'POST'}),

  acknowledgeAdherence: (logId) =>
    request(`/adherence/${logId}/ack`, {method: 'POST'}),

  dispenseRequest: ({userId, scheduleId, authMode = 'face'}) =>
    request('/dispense/request', {
      method: 'POST',
      body: {
        user_id: userId,
        ...(scheduleId != null ? {schedule_id: scheduleId} : {}),
        auth_mode: authMode,
      },
    }),

  getVoiceChallenge: () => request('/voice/challenge'),

  getEnrolStatus: (userId) => request(`/users/${userId}/enrol/status`),
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

/**
 * Merge schedules with today's adherence logs into UI-friendly dose rows.
 */
export function buildTodayDoses(schedules, adherenceLogs) {
  const bySchedule = {};
  (adherenceLogs || []).forEach(log => {
    const sid = log.schedule_id;
    if (!bySchedule[sid] || log.logged_at > bySchedule[sid].logged_at) {
      bySchedule[sid] = log;
    }
  });

  return (schedules || []).map(sched => {
    const log = bySchedule[sched.schedule_id];
    let status = 'pending';
    let takenAt = null;
    if (log) {
      if (log.outcome === 'TAKEN') {
        status = 'taken';
        takenAt = log.actual_time || null;
      } else if (log.outcome === 'MISSED' || log.outcome === 'REJECTED') {
        status = 'missed';
      } else if (log.outcome === 'MECHANICAL_ERROR') {
        status = 'missed';
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

export function nextPendingDose(doses) {
  const pending = doses
    .filter(d => d.status === 'pending')
    .slice()
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  return pending[0] || null;
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

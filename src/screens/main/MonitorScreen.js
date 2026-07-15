import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  Wifi,
  Signal,
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart2,
} from 'lucide-react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getApiConfig} from '../../services/config';
import {
  api,
  formatRelativeTime,
  initials,
  notificationTypeLabel,
  todayIsoDate,
} from '../../services/api';

function statusColorForType(type) {
  if (type === 'DISPENSED') return 'green';
  if (type === 'MISSED' || type === 'REJECTED' || type === 'MECHANICAL_ERROR') {
    return 'red';
  }
  return 'blue';
}

const MonitorScreen = ({navigation}) => {
  const [userName, setUserName] = useState('Patient');
  const [userId, setUserId] = useState(null);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [gsmAvailable, setGsmAvailable] = useState(false);
  const [taken, setTaken] = useState(0);
  const [missed, setMissed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [adherence, setAdherence] = useState(0);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const cfg = await getApiConfig();
      setUserName(cfg.userName || 'Patient');
      setUserId(cfg.userId);

      let online = false;
      let gsm = false;
      try {
        const health = await api.health();
        online = true;
        gsm = Boolean(health?.gsm_available);
      } catch {
        online = false;
      }
      setDeviceOnline(online);
      setGsmAvailable(gsm);

      if (!cfg.userId) {
        setError('Select a user in Settings → Device Connection.');
        setEvents([]);
        return;
      }

      const [logs, notifications] = await Promise.all([
        api.getAdherence(cfg.userId, todayIsoDate()),
        api.getNotifications(cfg.userId),
      ]);

      const list = logs || [];
      const t = list.filter(l => l.outcome === 'TAKEN').length;
      const m = list.filter(l => l.outcome === 'MISSED').length;
      const f = list.filter(
        l => l.outcome === 'REJECTED' || l.outcome === 'MECHANICAL_ERROR',
      ).length;
      const total = list.length;
      setTaken(t);
      setMissed(m);
      setFailed(f);
      setAdherence(total === 0 ? 0 : Math.round((t / total) * 100));

      setEvents(
        (notifications || []).slice(0, 12).map(n => {
          const color = statusColorForType(n.type);
          return {
            id: String(n.notification_id),
            title: notificationTypeLabel(n.type),
            subtitle: n.message,
            status: color === 'green' ? 'OK' : color === 'red' ? 'ALERT' : 'INFO',
            statusColor: color,
            when: formatRelativeTime(n.created_at),
          };
        }),
      );
      setError('');
    } catch (err) {
      setError(err.message || String(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const badgeLabel =
    adherence >= 80 ? 'Excellent' : adherence >= 50 ? 'Fair' : 'Needs attention';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(userName)}</Text>
          </View>
          <View>
            <Text style={styles.patientLabel}>Patient</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
          <Bell size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator color="#3B5BDB" style={{marginVertical: 20}} />
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.adherenceCard}>
        <View style={styles.adherenceTop}>
          <Text style={styles.adherenceTitle}>Today’s Adherence</Text>
          <View style={styles.excellentBadge}>
            <Text style={styles.excellentText}>{badgeLabel}</Text>
          </View>
        </View>

        <View style={styles.adherenceContent}>
          <View style={styles.adherenceCircle}>
            <Text style={styles.adherencePercent}>{adherence}%</Text>
          </View>
          <View style={styles.adherenceStats}>
            <View style={styles.adherenceStatRow}>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatLabel}>TAKEN</Text>
                <Text style={styles.adherenceStatValue}>{taken}</Text>
              </View>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatLabel}>MISSED</Text>
                <Text style={[styles.adherenceStatValue, {color: '#EF4444'}]}>
                  {missed}
                </Text>
              </View>
            </View>
            <View style={styles.adherenceStatRow}>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatLabel}>FAILED</Text>
                <Text style={styles.adherenceStatValue}>{failed}</Text>
              </View>
              <View style={styles.adherenceStat}>
                <BarChart2 size={24} color="#3B5BDB" />
              </View>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>DEVICE TELEMETRY</Text>
      <View style={styles.telemetryRow}>
        <View style={styles.telemetryCard}>
          <Wifi size={22} color={deviceOnline ? '#10B981' : '#EF4444'} />
          <Text style={styles.telemetryLabel}>Status</Text>
          <Text
            style={[
              styles.telemetryValue,
              {color: deviceOnline ? '#10B981' : '#EF4444'},
            ]}>
            {deviceOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View style={styles.telemetryCard}>
          <Signal size={22} color="#3B5BDB" />
          <Text style={styles.telemetryLabel}>GSM</Text>
          <Text style={styles.telemetryValue}>
            {gsmAvailable ? 'Ready' : 'N/A'}
          </Text>
        </View>
        <View style={styles.telemetryCard}>
          <Database size={22} color="#6B7280" />
          <Text style={styles.telemetryLabel}>User</Text>
          <Text style={styles.telemetryValue}>
            {userId != null ? `#${userId}` : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.recentEventsHeader}>
        <Text style={styles.recentEventsTitle}>RECENT EVENTS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {!loading && events.length === 0 && (
        <Text style={styles.emptyText}>No hub notifications yet.</Text>
      )}

      {events.map(event => (
        <View key={event.id} style={styles.eventCard}>
          <View
            style={[
              styles.eventBar,
              {
                backgroundColor:
                  event.statusColor === 'green'
                    ? '#10B981'
                    : event.statusColor === 'red'
                      ? '#EF4444'
                      : '#3B5BDB',
              },
            ]}
          />
          <View style={styles.eventIcon}>
            {event.statusColor === 'green' ? (
              <CheckCircle size={22} color="#10B981" />
            ) : event.statusColor === 'red' ? (
              <XCircle size={22} color="#EF4444" />
            ) : (
              <RefreshCw size={22} color="#3B5BDB" />
            )}
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventSub}>{event.subtitle}</Text>
            {!!event.when && (
              <Text style={styles.eventWhen}>{event.when}</Text>
            )}
          </View>
          <View
            style={[
              styles.eventStatusBadge,
              {
                backgroundColor:
                  event.statusColor === 'green'
                    ? '#D1FAE5'
                    : event.statusColor === 'red'
                      ? '#FEE2E2'
                      : '#EEF2FF',
              },
            ]}>
            <Text
              style={[
                styles.eventStatusText,
                {
                  color:
                    event.statusColor === 'green'
                      ? '#065F46'
                      : event.statusColor === 'red'
                        ? '#991B1B'
                        : '#3B5BDB',
                },
              ]}>
              {event.status}
            </Text>
          </View>
        </View>
      ))}

      <View style={{height: 20}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6', paddingHorizontal: 16},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 16,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold'},
  patientLabel: {fontSize: 11, color: '#6B7280'},
  userName: {fontSize: 16, fontWeight: 'bold', color: '#3B5BDB'},
  errorText: {color: '#B91C1C', marginBottom: 12, fontSize: 13},
  emptyText: {color: '#9CA3AF', marginBottom: 12, fontSize: 13},
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  adherenceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  adherenceTitle: {fontSize: 18, fontWeight: 'bold', color: '#111827'},
  excellentBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  excellentText: {fontSize: 12, color: '#065F46', fontWeight: '600'},
  adherenceContent: {flexDirection: 'row', alignItems: 'center', gap: 20},
  adherenceCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adherencePercent: {fontSize: 20, fontWeight: 'bold', color: '#3B5BDB'},
  adherenceStats: {flex: 1, gap: 12},
  adherenceStatRow: {flexDirection: 'row', gap: 12},
  adherenceStat: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
  },
  adherenceStatLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  adherenceStatValue: {fontSize: 20, fontWeight: 'bold', color: '#111827'},
  sectionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10,
  },
  telemetryRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  telemetryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  telemetryLabel: {fontSize: 11, color: '#6B7280'},
  telemetryValue: {fontSize: 13, fontWeight: 'bold', color: '#111827'},
  recentEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentEventsTitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
  },
  viewAll: {fontSize: 13, color: '#3B5BDB', fontWeight: '500'},
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventBar: {width: 4, height: 40, borderRadius: 2, marginRight: 12},
  eventIcon: {marginRight: 12},
  eventInfo: {flex: 1},
  eventTitle: {fontSize: 14, fontWeight: '600', color: '#111827'},
  eventSub: {fontSize: 12, color: '#6B7280', marginTop: 2},
  eventWhen: {fontSize: 11, color: '#9CA3AF', marginTop: 2},
  eventStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eventStatusText: {fontSize: 11, fontWeight: '600'},
});

export default MonitorScreen;

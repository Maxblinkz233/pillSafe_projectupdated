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
  AlertTriangle,
  CheckCircle,
  Shield,
  Battery,
  ChevronLeft,
} from 'lucide-react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getApiConfig} from '../../services/config';
import {
  api,
  formatRelativeTime,
  initials,
  notificationTypeLabel,
} from '../../services/api';

const AlertsScreen = ({navigation}) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [userName, setUserName] = useState('Patient');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const filters = ['All', 'Dispensed', 'Missed', 'Verification'];

  const load = useCallback(async () => {
    try {
      const cfg = await getApiConfig();
      setUserName(cfg.userName || 'Patient');
      const rows = await api.getNotifications(cfg.userId);
      const mapped = (rows || []).map(n => ({
        id: String(n.notification_id),
        notificationId: n.notification_id,
        apiType: n.type,
        type: notificationTypeLabel(n.type),
        title: n.type,
        message: n.message,
        time: formatRelativeTime(n.created_at),
        isNew: !n.is_read,
      }));
      setAlerts(mapped);
      setError('');
    } catch (err) {
      setError(err.message || String(err));
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const getAlertColor = type => {
    if (type === 'MISSED DOSE') return '#EF4444';
    if (type === 'DOSE DISPENSED') return '#10B981';
    if (type === 'VERIFICATION FAILED') return '#EF4444';
    if (type === 'IDENTITY VERIFIED') return '#3B5BDB';
    if (type === 'REMINDER') return '#3B5BDB';
    if (type === 'LOW INVENTORY') return '#F59E0B';
    if (type === 'DEVICE ALERT') return '#F59E0B';
    return '#6B7280';
  };

  const getAlertIcon = type => {
    const color = getAlertColor(type);
    if (type === 'MISSED DOSE' || type === 'VERIFICATION FAILED') {
      return <AlertTriangle size={16} color={color} />;
    }
    if (type === 'DOSE DISPENSED') {
      return <CheckCircle size={16} color={color} />;
    }
    if (type === 'REMINDER' || type === 'IDENTITY VERIFIED') {
      return <Shield size={16} color={color} />;
    }
    if (type === 'DEVICE ALERT' || type === 'LOW INVENTORY') {
      return <Battery size={16} color={color} />;
    }
    return <Bell size={16} color={color} />;
  };

  const filteredAlerts =
    activeFilter === 'All'
      ? alerts
      : alerts.filter(a => {
          if (activeFilter === 'Missed') {
            return a.apiType === 'MISSED' || a.apiType === 'REJECTED';
          }
          if (activeFilter === 'Dispensed') return a.apiType === 'DISPENSED';
          if (activeFilter === 'Verification') {
            return a.apiType === 'REJECTED' || a.apiType === 'REMINDER';
          }
          return true;
        });

  const markAllRead = async () => {
    const unread = alerts.filter(a => a.isNew);
    await Promise.all(
      unread.map(a =>
        api.markNotificationRead(a.notificationId).catch(() => null),
      ),
    );
    load();
  };

  const markOneRead = async alert => {
    if (!alert.isNew) return;
    try {
      await api.markNotificationRead(alert.notificationId);
      load();
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerUser}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(userName)}</Text>
            </View>
            <View>
              <Text style={styles.patientLabel}>Patient</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </View>
        </View>
        <View style={styles.bellContainer}>
          <Bell size={24} color="#374151" />
          {alerts.some(a => a.isNew) && <View style={styles.bellBadge} />}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Alerts & Notifications</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.unreadRow}>
          <View style={styles.unreadDot} />
          <Text style={styles.unreadCount}>
            {alerts.filter(a => a.isNew).length} unread notifications
          </Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}>
          {filters.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter)}>
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.filterTextActive,
                ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#3B5BDB" style={{marginVertical: 24}} />
        ) : filteredAlerts.length === 0 ? (
          <Text style={styles.emptyText}>No notifications from the hub yet.</Text>
        ) : (
          filteredAlerts.map(alert => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                {borderLeftColor: getAlertColor(alert.type)},
              ]}
              onPress={() => markOneRead(alert)}>
              <View style={styles.alertTop}>
                <View style={styles.alertTypeRow}>
                  {getAlertIcon(alert.type)}
                  <Text
                    style={[
                      styles.alertType,
                      {color: getAlertColor(alert.type)},
                    ]}>
                    {alert.type}
                  </Text>
                </View>
                {alert.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
              </View>

              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>

              {alert.apiType === 'MISSED' && (
                <View style={styles.alertActions}>
                  <TouchableOpacity
                    style={styles.markTakenButton}
                    onPress={() => navigation.navigate('Verify')}>
                    <Text style={styles.markTakenText}>Verify Now</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.alertTime}>{alert.time}</Text>
            </TouchableOpacity>
          ))
        )}

        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  bellContainer: {
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  markAllRead: {
    fontSize: 13,
    color: '#3B5BDB',
    fontWeight: '500',
  },
  unreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  unreadCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  errorText: {
    color: '#991B1B',
    marginBottom: 12,
    fontSize: 13,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#3B5BDB',
    borderColor: '#3B5BDB',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  newBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  markTakenButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  markTakenText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
});

export default AlertsScreen;

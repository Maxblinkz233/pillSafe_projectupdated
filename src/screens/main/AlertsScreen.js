import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Shield,
  Battery,
  ChevronLeft,
} from 'lucide-react-native';
import { alerts } from '../../data/mockData';

const AlertsScreen = ({ navigation }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Dispensed', 'Missed', 'Verification'];

  const getAlertColor = type => {
    if (type === 'MISSED DOSE') return '#EF4444';
    if (type === 'DOSE DISPENSED') return '#10B981';
    if (type === 'IDENTITY VERIFIED') return '#3B5BDB';
    if (type === 'DEVICE ALERT') return '#F59E0B';
    return '#6B7280';
  };

  const getAlertIcon = type => {
    if (type === 'MISSED DOSE')
      return <AlertTriangle size={16} color={getAlertColor(type)} />;
    if (type === 'DOSE DISPENSED')
      return <CheckCircle size={16} color={getAlertColor(type)} />;
    if (type === 'IDENTITY VERIFIED')
      return <Shield size={16} color={getAlertColor(type)} />;
    if (type === 'DEVICE ALERT')
      return <Battery size={16} color={getAlertColor(type)} />;
    return <Bell size={16} color={getAlertColor(type)} />;
  };

  const filteredAlerts =
    activeFilter === 'All'
      ? alerts
      : alerts.filter(a => {
          if (activeFilter === 'Missed') return a.type === 'MISSED DOSE';
          if (activeFilter === 'Dispensed') return a.type === 'DOSE DISPENSED';
          if (activeFilter === 'Verification')
            return a.type === 'IDENTITY VERIFIED';
          return true;
        });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerUser}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>M</Text>
            </View>
            <View>
              <Text style={styles.patientLabel}>Patient</Text>
              <Text style={styles.userName}>Maxwell</Text>
            </View>
          </View>
        </View>
        <View style={styles.bellContainer}>
          <Bell size={24} color="#374151" />
          <View style={styles.bellBadge} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Alerts & Notifications</Text>
          <TouchableOpacity>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.unreadRow}>
          <View style={styles.unreadDot} />
          <Text style={styles.unreadCount}>
            {alerts.filter(a => a.isNew).length} unread notifications
          </Text>
        </View>

        {/* Filters */}
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

        {/* Alert Cards */}
        {filteredAlerts.map(alert => (
          <View
            key={alert.id}
            style={[
              styles.alertCard,
              { borderLeftColor: getAlertColor(alert.type) },
            ]}>
            <View style={styles.alertTop}>
              <View style={styles.alertTypeRow}>
                {getAlertIcon(alert.type)}
                <Text
                  style={[
                    styles.alertType,
                    { color: getAlertColor(alert.type) },
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

            {alert.type === 'MISSED DOSE' && (
              <View style={styles.alertActions}>
                <TouchableOpacity style={styles.markTakenButton}>
                  <Text style={styles.markTakenText}>Mark as Taken</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.snoozeButton}>
                  <Text style={styles.snoozeText}>Snooze</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.alertTime}>{alert.time}</Text>
          </View>
        ))}

        <View style={{ height: 30 }} />
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
    shadowOffset: { width: 0, height: 1 },
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
    shadowOffset: { width: 0, height: 1 },
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
  snoozeButton: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  snoozeText: {
    color: '#374151',
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
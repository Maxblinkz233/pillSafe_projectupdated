import React from 'react';
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
  Wifi,
  Signal,
  Database,
  Phone,
  MessageCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart2,
} from 'lucide-react-native';
import { caregiver, recentEvents } from '../../data/mockData';

const MonitorScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View>
            <Text style={styles.patientLabel}>Patient</Text>
            <Text style={styles.userName}>Maxwell</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
          <Bell size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Weekly Adherence Card */}
      <View style={styles.adherenceCard}>
        <View style={styles.adherenceTop}>
          <Text style={styles.adherenceTitle}>Weekly Adherence</Text>
          <View style={styles.excellentBadge}>
            <Text style={styles.excellentText}>Excellent</Text>
          </View>
        </View>

        <View style={styles.adherenceContent}>
          <View style={styles.adherenceCircle}>
            <Text style={styles.adherencePercent}>84%</Text>
          </View>
          <View style={styles.adherenceStats}>
            <View style={styles.adherenceStatRow}>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatLabel}>TAKEN</Text>
                <Text style={styles.adherenceStatValue}>4</Text>
              </View>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatLabel}>MISSED</Text>
                <Text style={[styles.adherenceStatValue, { color: '#EF4444' }]}>1</Text>
              </View>
            </View>
            <View style={styles.adherenceStatRow}>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatLabel}>FAILED</Text>
                <Text style={styles.adherenceStatValue}>0</Text>
              </View>
              <View style={styles.adherenceStat}>
                <BarChart2 size={24} color="#3B5BDB" />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Device Telemetry */}
      <Text style={styles.sectionLabel}>DEVICE TELEMETRY</Text>
      <View style={styles.telemetryRow}>
        <View style={styles.telemetryCard}>
          <Wifi size={22} color="#10B981" />
          <Text style={styles.telemetryLabel}>Status</Text>
          <Text style={[styles.telemetryValue, { color: '#10B981' }]}>Online</Text>
        </View>
        <View style={styles.telemetryCard}>
          <Signal size={22} color="#3B5BDB" />
          <Text style={styles.telemetryLabel}>Signal</Text>
          <Text style={styles.telemetryValue}>Strong</Text>
        </View>
        <View style={styles.telemetryCard}>
          <Database size={22} color="#6B7280" />
          <Text style={styles.telemetryLabel}>Slots</Text>
          <Text style={styles.telemetryValue}>24 / 28</Text>
        </View>
      </View>

      {/* Caregiver Card */}
      <View style={styles.caregiverCard}>
        <View style={styles.caregiverTop}>
          <View style={styles.caregiverAvatar}>
            <Text style={styles.caregiverAvatarText}>SM</Text>
          </View>
          <View style={styles.caregiverInfo}>
            <Text style={styles.caregiverName}>{caregiver.name}</Text>
            <Text style={styles.caregiverRole}>{caregiver.role}</Text>
          </View>
          <TouchableOpacity style={styles.contactButton}>
            <Phone size={16} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton}>
            <MessageCircle size={16} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.smsLog}>
          <Text style={styles.smsLogLabel}>SMS Alert Log</Text>
          {caregiver.smsLog.map((log, index) => (
            <View key={index} style={styles.smsLogItem}>
              <Text style={styles.smsLogMessage}>{log.message}</Text>
              <Text style={styles.smsLogTime}>{log.time}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Events */}
      <View style={styles.recentEventsHeader}>
        <Text style={styles.recentEventsTitle}>RECENT EVENTS</Text>
        <TouchableOpacity>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentEvents.map(event => (
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

      <View style={{ height: 20 }} />
    </ScrollView>
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
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  patientLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adherenceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  adherenceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  excellentBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  excellentText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  adherenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  adherenceCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adherencePercent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  adherenceStats: {
    flex: 1,
    gap: 12,
  },
  adherenceStatRow: {
    flexDirection: 'row',
    gap: 12,
  },
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
  adherenceStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10,
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  telemetryLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
  },
  caregiverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  caregiverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  caregiverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiverAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  caregiverRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  contactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsLog: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  smsLogLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  smsLogItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  smsLogMessage: {
    fontSize: 13,
    color: '#374151',
  },
  smsLogTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
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
  viewAll: {
    fontSize: 13,
    color: '#3B5BDB',
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  eventIcon: {
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  eventSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  eventStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eventStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MonitorScreen;
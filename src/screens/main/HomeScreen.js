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
  Pill,
  BarChart2,
  X,
  Wifi,
  Clock,
  CheckCircle,
  AlertTriangle,
  Timer,
  Smartphone,
  FlaskConical,
  Info,
} from 'lucide-react-native';
import {
  currentUser,
  dashboardStats,
  nextDispense,
  medications,
} from '../../data/mockData';

const HomeScreen = ({ navigation }) => {
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
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.bellContainer}
          onPress={() => navigation.navigate('Alerts')}>
          <Bell size={24} color="#374151" />
          <View style={styles.bellBadge} />
        </TouchableOpacity>
      </View>

      {/* Missed Dose Alert */}
      <View style={styles.missedAlert}>
        <View style={styles.missedAlertLeft}>
          <AlertTriangle size={20} color="#FCA5A5" />
          <View style={styles.missedAlertText}>
            <Text style={styles.missedAlertLabel}>MISSED DOSE ALERT</Text>
            <Text style={styles.missedAlertMed}>Metformin 500mg</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.takeNowButton}>
          <Text style={styles.takeNowText}>TAKE NOW</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Pill size={22} color="#3B5BDB" />
          <Text style={styles.statLabel}>Today's Doses</Text>
          <Text style={styles.statValue}>
            {dashboardStats.todayDoses} / {dashboardStats.totalDoses}
          </Text>
        </View>
        <View style={styles.statCard}>
          <BarChart2 size={22} color="#10B981" />
          <Text style={styles.statLabel}>Adherence</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {dashboardStats.adherence}%
          </Text>
        </View>
        <View style={styles.statCard}>
          <X size={22} color="#EF4444" />
          <Text style={styles.statLabel}>Missed</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {dashboardStats.missed}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Wifi size={22} color="#10B981" />
          <Text style={styles.statLabel}>Device Status</Text>
          <Text style={[styles.statValue, { color: '#10B981', fontSize: 16 }]}>
            {dashboardStats.deviceStatus}
          </Text>
        </View>
      </View>

      {/* Next Dispense Card */}
      <View style={styles.nextDispenseCard}>
        <View style={styles.nextDispenseHeader}>
          <Text style={styles.nextDispenseLabel}>NEXT DISPENSE</Text>
          <Clock size={20} color="#A5B4FC" />
        </View>
        <Text style={styles.nextDispenseTime}>{nextDispense.time}</Text>
        <View style={styles.nextDispenseBottom}>
          <View>
            <Text style={styles.nextDispenseMed}>{nextDispense.medication}</Text>
            <Text style={styles.nextDispenseSub}>
              {nextDispense.dosage} • {nextDispense.category}
            </Text>
          </View>
          <View style={styles.slotBadge}>
            <Text style={styles.slotBadgeText}>{nextDispense.slot}</Text>
          </View>
        </View>
      </View>

      {/* Today's Schedule */}
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>Today's Schedule</Text>
        <TouchableOpacity>
          <Text style={styles.viewTimeline}>View Timeline</Text>
        </TouchableOpacity>
      </View>

      {medications.map(med => (
        <View key={med.id} style={styles.medCard}>
          <View
            style={[
              styles.medStatusBar,
              {
                backgroundColor:
                  med.status === 'taken'
                    ? '#10B981'
                    : med.status === 'pending'
                    ? '#3B5BDB'
                    : '#EF4444',
              },
            ]}
          />
          <View style={styles.medIconContainer}>
            {med.status === 'taken' ? (
              <CheckCircle size={22} color="#10B981" />
            ) : med.status === 'pending' ? (
              <Timer size={22} color="#3B5BDB" />
            ) : (
              <AlertTriangle size={22} color="#EF4444" />
            )}
          </View>
          <View style={styles.medInfo}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.medSub}>
              {med.dosage} • {med.category} • {med.slot}
            </Text>
          </View>
          <Text
            style={[
              styles.medStatus,
              {
                color:
                  med.status === 'taken'
                    ? '#10B981'
                    : med.status === 'pending'
                    ? '#3B5BDB'
                    : '#EF4444',
              },
            ]}>
            {med.status === 'taken'
              ? `Taken ${med.takenAt}`
              : med.status === 'pending'
              ? `Pending ${med.time}`
              : `Missed ${med.time}`}
          </Text>
        </View>
      ))}

      {/* Device Card */}
      <View style={styles.deviceCard}>
        <View style={styles.deviceLeft}>
          <View style={styles.deviceImagePlaceholder}>
            <Smartphone size={24} color="#3B5BDB" />
          </View>
          <View>
            <Text style={styles.deviceName}>PillSafe Hub V2</Text>
            <View style={styles.deviceOnline}>
              <View style={styles.onlineDot} />
              <Text style={styles.deviceOnlineText}>Connected: Home Wi-Fi</Text>
            </View>
            <Text style={styles.deviceSync}>Last sync: 2 mins ago</Text>
          </View>
        </View>
        <View style={styles.deviceButtons}>
          <TouchableOpacity style={styles.deviceBtn}>
            <FlaskConical size={14} color="#374151" />
            <Text style={styles.deviceBtnText}>Test Dispense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deviceBtnOutline}>
            <Info size={14} color="#374151" />
            <Text style={styles.deviceBtnOutlineText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  greeting: {
    fontSize: 13,
    color: '#6B7280',
  },
  userName: {
    fontSize: 16,
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
  missedAlert: {
    backgroundColor: '#991B1B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  missedAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  missedAlertText: {
    marginLeft: 4,
  },
  missedAlertLabel: {
    fontSize: 10,
    color: '#FCA5A5',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  missedAlertMed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  takeNowButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  takeNowText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  nextDispenseCard: {
    backgroundColor: '#3B5BDB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  nextDispenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextDispenseLabel: {
    fontSize: 11,
    color: '#A5B4FC',
    fontWeight: '600',
    letterSpacing: 1,
  },
  nextDispenseTime: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  nextDispenseBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  nextDispenseMed: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  nextDispenseSub: {
    fontSize: 13,
    color: '#A5B4FC',
  },
  slotBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  slotBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewTimeline: {
    fontSize: 13,
    color: '#3B5BDB',
    fontWeight: '500',
  },
  medCard: {
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
  medStatusBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  medIconContainer: {
    marginRight: 12,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  medSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  medStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  deviceCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  deviceImagePlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#C7D2FE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  deviceOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  deviceOnlineText: {
    fontSize: 12,
    color: '#374151',
  },
  deviceSync: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  deviceButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  deviceBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 6,
  },
  deviceBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  deviceBtnOutline: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 6,
  },
  deviceBtnOutlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
});

export default HomeScreen;
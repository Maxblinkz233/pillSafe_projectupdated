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
  Sun,
  Pill,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import { medications } from '../../data/mockData';

const ScheduleScreen = ({ navigation }) => {
  const morningMeds = medications.filter(m => m.period === 'MORNING');
  const afternoonMeds = medications.filter(m => m.period === 'AFTERNOON');

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

      {/* Title */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.protocolLabel}>TODAY'S PROTOCOL</Text>
          <Text style={styles.title}>Medication Schedule</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMedication')}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Med</Text>
        </TouchableOpacity>
      </View>

      {/* Morning Section */}
      <View style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <View style={styles.periodIconContainer}>
            <Sun size={20} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.periodTitle}>MORNING</Text>
            <Text style={styles.periodTime}>06:00 - 11:00</Text>
          </View>
        </View>

        {morningMeds.map(med => (
          <TouchableOpacity key={med.id} style={styles.medCard}>
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
              <Pill size={20} color="#6B7280" />
            </View>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medSub}>
                {med.dosage} • {med.time}
              </Text>
            </View>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>{med.slot}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Afternoon Section */}
      <View style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <View style={[styles.periodIconContainer, { backgroundColor: '#FEF3C7' }]}>
            <Sun size={20} color="#D97706" />
          </View>
          <View>
            <Text style={styles.periodTitle}>AFTERNOON</Text>
            <Text style={styles.periodTime}>12:00 - 17:00</Text>
          </View>
        </View>

        {afternoonMeds.map(med => (
          <TouchableOpacity key={med.id} style={styles.medCard}>
            <View style={[styles.medStatusBar, { backgroundColor: '#F59E0B' }]} />
            <View style={styles.medIconContainer}>
              <Pill size={20} color="#6B7280" />
            </View>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medSub}>
                {med.dosage} • {med.time}
              </Text>
            </View>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>{med.slot}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Streak Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakLeft}>
          <Text style={styles.streakTitle}>Perfect Streak!</Text>
          <Text style={styles.streakSub}>
            You've taken all your morning meds on time for 5 days.
          </Text>
        </View>
        <View style={styles.streakCircle}>
          <Text style={styles.streakPercent}>75%</Text>
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
  patientLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  protocolLabel: {
    fontSize: 11,
    color: '#3B5BDB',
    fontWeight: '600',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  periodSection: {
    marginBottom: 20,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  periodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 1,
  },
  periodTime: {
    fontSize: 12,
    color: '#6B7280',
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
  slotBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  slotBadgeText: {
    fontSize: 12,
    color: '#3B5BDB',
    fontWeight: '600',
  },
  streakCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  streakLeft: {
    flex: 1,
    marginRight: 16,
  },
  streakTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 4,
  },
  streakSub: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
  streakCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065F46',
  },
});

export default ScheduleScreen;
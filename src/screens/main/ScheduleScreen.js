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
  Sun,
  Moon,
  Pill,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getApiConfig} from '../../services/config';
import {
  api,
  buildTodayDoses,
  initials,
  todayIsoDate,
} from '../../services/api';

const ScheduleScreen = ({navigation}) => {
  const [userName, setUserName] = useState('Patient');
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [adherencePct, setAdherencePct] = useState(0);

  const load = useCallback(async () => {
    try {
      const cfg = await getApiConfig();
      setUserName(cfg.userName || 'Patient');
      if (!cfg.userId) {
        setError('Select a user in Settings → Device Connection.');
        setDoses([]);
        return;
      }
      const [schedules, logs] = await Promise.all([
        api.getSchedules(cfg.userId),
        api.getAdherence(cfg.userId, todayIsoDate()),
      ]);
      const today = buildTodayDoses(schedules, logs);
      setDoses(today);
      const taken = today.filter(d => d.status === 'taken').length;
      setAdherencePct(
        today.length === 0 ? 0 : Math.round((taken / today.length) * 100),
      );
      setError('');
    } catch (err) {
      setError(err.message || String(err));
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

  const morningMeds = doses.filter(m => m.period === 'MORNING');
  const afternoonMeds = doses.filter(m => m.period === 'AFTERNOON');
  const eveningMeds = doses.filter(
    m => m.period === 'EVENING' || m.period === 'OTHER',
  );

  const renderSection = (title, subtitle, icon, meds, iconBg) => {
    if (!meds.length) return null;
    return (
      <View style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <View style={[styles.periodIconContainer, {backgroundColor: iconBg}]}>
            {icon}
          </View>
          <View>
            <Text style={styles.periodTitle}>{title}</Text>
            <Text style={styles.periodTime}>{subtitle}</Text>
          </View>
        </View>
        {meds.map(med => (
          <TouchableOpacity
            key={med.id}
            style={styles.medCard}
            onPress={() => navigation.navigate('Verify')}>
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
                {med.dosage || 'Dose'} • {med.time} • {med.status}
              </Text>
            </View>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>{med.slot}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
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

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <ActivityIndicator color="#3B5BDB" style={{marginVertical: 24}} />
      ) : doses.length === 0 ? (
        <Text style={styles.emptyText}>
          No active schedules from the PillSafe hub.
        </Text>
      ) : (
        <>
          {renderSection(
            'MORNING',
            '06:00 - 11:59',
            <Sun size={20} color="#F59E0B" />,
            morningMeds,
            '#FEF9C3',
          )}
          {renderSection(
            'AFTERNOON',
            '12:00 - 16:59',
            <Sun size={20} color="#D97706" />,
            afternoonMeds,
            '#FEF3C7',
          )}
          {renderSection(
            'EVENING',
            '17:00 - 23:59',
            <Moon size={20} color="#6366F1" />,
            eveningMeds,
            '#EEF2FF',
          )}

          <View style={styles.streakCard}>
            <View style={styles.streakLeft}>
              <Text style={styles.streakTitle}>Today's adherence</Text>
              <Text style={styles.streakSub}>
                Based on live schedules and adherence logs from the hub.
              </Text>
            </View>
            <View style={styles.streakCircle}>
              <Text style={styles.streakPercent}>{adherencePct}%</Text>
            </View>
          </View>
        </>
      )}

      <View style={{height: 20}} />
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
  errorText: {
    color: '#991B1B',
    marginBottom: 12,
    fontSize: 13,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
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
    shadowOffset: {width: 0, height: 1},
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

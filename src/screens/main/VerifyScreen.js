import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw,
  Key,
  Camera,
  ScanFace,
  Mic,
} from 'lucide-react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getApiConfig} from '../../services/config';
import {
  actionableDoses,
  api,
  buildTodayDoses,
  greetingForNow,
  initials,
  nextPendingDose,
  todayIsoDate,
} from '../../services/api';

const VerifyScreen = ({navigation, route}) => {
  const routeScheduleId = route?.params?.scheduleId;
  const [verifyState, setVerifyState] = useState('ready');
  const [userName, setUserName] = useState('Patient');
  const [userId, setUserId] = useState(null);
  const [doses, setDoses] = useState([]);
  const [selectedDose, setSelectedDose] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(true);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const cfg = await getApiConfig();
      setUserName(cfg.userName || 'Patient');
      setUserId(cfg.userId);

      if (!cfg.userId) {
        setDoses([]);
        setSelectedDose(null);
        setErrorMessage('Select a user in Settings → Device Connection.');
        return;
      }

      const [schedules, logs] = await Promise.all([
        api.getSchedules(cfg.userId),
        api.getAdherence(cfg.userId, todayIsoDate()),
      ]);
      const today = buildTodayDoses(schedules, logs);
      const actionable = actionableDoses(today);
      setDoses(actionable);

      let pick =
        actionable.find(d => Number(d.scheduleId) === Number(routeScheduleId)) ||
        null;
      if (!pick) {
        pick = nextPendingDose(today);
      }
      if (!pick && actionable.length) {
        pick = actionable[0];
      }
      setSelectedDose(pick);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.message || String(err));
      setDoses([]);
      setSelectedDose(null);
    } finally {
      setLoadingMeta(false);
    }
  }, [routeScheduleId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await loadMeta();
      })();
      return () => {
        active = false;
      };
    }, [loadMeta]),
  );

  const startScan = async () => {
    if (!userId) {
      Alert.alert(
        'Not configured',
        'Set API URL, token, and user ID under Settings → Device Connection.',
      );
      return;
    }
    if (!selectedDose) {
      Alert.alert(
        'No dose selected',
        'Add a medication schedule, or pick a dose below.',
      );
      return;
    }

    setVerifyState('scanning');
    setErrorMessage('');
    try {
      const result = await api.verifyAndDispense({
        userId,
        scheduleId: selectedDose.scheduleId,
        authMode: 'face',
      });
      if (!result?.accepted) {
        throw new Error(
          result?.error ||
            'Face verification failed. Stand in front of the hub camera and try again.',
        );
      }
      setLastResult({
        mode: result?.auth_mode || 'face',
        medication:
          result?.medication_name || selectedDose.name || 'Scheduled dose',
        dosage: selectedDose.dosage || '',
        scheduleId: selectedDose.scheduleId,
        dispensed: Boolean(result?.dispensed),
        confidence: result?.confidence,
        hubResult: result?.result,
      });
      setVerifyState('success');
      setTimeout(loadMeta, 4000);
    } catch (err) {
      setErrorMessage(err.message || String(err));
      setVerifyState('failed');
    }
  };

  const reset = () => {
    setVerifyState('ready');
    setErrorMessage('');
    loadMeta();
  };

  if (verifyState === 'ready') {
    return (
      <ReadyState
        onScan={startScan}
        navigation={navigation}
        userName={userName}
        doses={doses}
        selectedDose={selectedDose}
        onSelectDose={setSelectedDose}
        loading={loadingMeta}
        errorMessage={errorMessage}
      />
    );
  }
  if (verifyState === 'scanning') return <ScanningState />;
  if (verifyState === 'success') {
    return <SuccessState onDone={reset} userName={userName} result={lastResult} />;
  }
  return (
    <FailedState
      onRetry={startScan}
      onOverride={reset}
      message={errorMessage}
    />
  );
};

const statusLabel = status => {
  if (status === 'due') return 'Due now';
  if (status === 'missed') return 'Missed — can verify late';
  if (status === 'pending') return 'Upcoming';
  return status;
};

const ReadyState = ({
  onScan,
  navigation,
  userName,
  doses,
  selectedDose,
  onSelectDose,
  loading,
  errorMessage,
}) => (
  <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
    <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerLeft}
        onPress={() => navigation.navigate('Profile')}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(userName)}</Text>
        </View>
        <View>
          <Text style={styles.greeting}>{greetingForNow()}</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
        <Bell size={24} color="#374151" />
      </TouchableOpacity>
    </View>

    <View style={styles.readyContent}>
      <Text style={styles.readyTitle}>Ready to Dispense?</Text>
      {loading ? (
        <ActivityIndicator color="#3B5BDB" style={{marginBottom: 24}} />
      ) : (
        <Text style={styles.readySub}>
          Choose any due, upcoming, or missed dose. A missed morning pill does
          not block an afternoon dose.
        </Text>
      )}

      {!!errorMessage && <Text style={styles.errorHint}>{errorMessage}</Text>}

      {doses.length > 0 && (
        <View style={styles.doseList}>
          {doses.map(dose => {
            const selected =
              selectedDose &&
              Number(selectedDose.scheduleId) === Number(dose.scheduleId);
            return (
              <TouchableOpacity
                key={dose.id}
                style={[styles.doseCard, selected && styles.doseCardSelected]}
                onPress={() => onSelectDose(dose)}>
                <View style={styles.doseCardText}>
                  <Text style={styles.doseName}>{dose.name}</Text>
                  <Text style={styles.doseMeta}>
                    {dose.time} • {dose.slot} • {statusLabel(dose.status)}
                  </Text>
                </View>
                {selected && <CheckCircle size={18} color="#3B5BDB" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.faceFrame}>
        <View style={styles.faceFrameCornerTL} />
        <View style={styles.faceFrameCornerTR} />
        <View style={styles.faceFrameCornerBL} />
        <View style={styles.faceFrameCornerBR} />
        <View style={styles.faceCircle}>
          <ScanFace size={60} color="#C7D2FE" />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.scanButton, !selectedDose && styles.scanButtonDisabled]}
        onPress={onScan}
        disabled={!selectedDose}>
        <Camera size={20} color="#FFFFFF" />
        <Text style={styles.scanButtonText}>Verify Now (Face)</Text>
      </TouchableOpacity>
      <Text style={styles.scanHint}>
        {selectedDose
          ? `Selected: ${selectedDose.name} at ${selectedDose.time}`
          : 'No dose selected'}
      </Text>
      <TouchableOpacity
        style={styles.voiceButton}
        onPress={() =>
          navigation.navigate('VoiceVerify', {
            scheduleId: selectedDose?.scheduleId,
          })
        }>
        <Mic size={20} color="#3B5BDB" />
        <Text style={styles.voiceButtonText}>Use Voice Instead</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

const ScanningState = () => (
  <ScrollView style={styles.container}>
    <View style={styles.scanningHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>P</Text>
      </View>
      <Text style={styles.pillSafeLogo}>PillSafe</Text>
    </View>

    <Text style={styles.scanningTitle}>Verify & Dispense</Text>
    <Text style={styles.scanningSubtitle}>
      Look at the hub camera now.{'\n'}
      PillSafe is matching your face before dispensing.
    </Text>

    <View style={styles.scanCircleOuter}>
      <View style={styles.scanCircleMiddle}>
        <View style={styles.scanCircleInner}>
          <ActivityIndicator size="large" color="#3B5BDB" />
        </View>
      </View>
    </View>

    <View style={styles.stepsList}>
      <StepItem
        icon={<CheckCircle size={22} color="#10B981" />}
        title="Verify Now sent"
        subtitle="Waiting for the hub camera to capture"
        status="done"
      />
      <View style={styles.stepDivider} />
      <StepItem
        icon={<RefreshCw size={22} color="#3B5BDB" />}
        title="Matching face"
        subtitle="Hub FaceNet verifying the scheduled patient..."
        status="active"
      />
      <View style={styles.stepDivider} />
      <StepItem
        icon={<CheckCircle size={22} color="#D1D5DB" />}
        title="Rotating carousel"
        subtitle="Aligning medication slot"
        status="pending"
      />
      <View style={styles.stepDivider} />
      <StepItem
        icon={<CheckCircle size={22} color="#D1D5DB" />}
        title="Waiting for pickup"
        subtitle="Collect from the delivery tray"
        status="pending"
      />
    </View>
    <View style={{height: 40}} />
  </ScrollView>
);

const SuccessState = ({onDone, userName, result}) => (
  <ScrollView style={styles.container}>
    <View style={styles.successHeader}>
      <View style={styles.headerLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(userName)}</Text>
        </View>
        <View>
          <Text style={styles.greeting}>{greetingForNow()}</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>
      <View style={styles.logoBadge}>
        <Text style={styles.logoText}>PillSafe</Text>
      </View>
    </View>

    <View style={styles.successContent}>
      <View style={styles.successCircle}>
        <CheckCircle size={50} color="#FFFFFF" />
      </View>
      <Text style={styles.successTitle}>
        {result?.dispensed ? 'Dose Dispensed' : 'Identity Verified'}
      </Text>
      <Text style={styles.successSub}>
        {result?.dispensed
          ? `Welcome, ${userName}. Collect your medication from the tray.`
          : `Welcome, ${userName}. Face matched — check the hub tray.`}
      </Text>
    </View>

    <View style={styles.verificationLogs}>
      <Text style={styles.logsTitle}>VERIFICATION LOGS</Text>
      <LogItem label="Face match" status={result?.hubResult || 'ACCEPTED'} />
      <LogItem label="Auth mode" status={(result?.mode || 'face').toUpperCase()} />
      <LogItem
        label="Dispense"
        status={result?.dispensed ? 'COMPLETE' : 'CHECK HUB'}
      />
    </View>

    <View style={styles.currentBatch}>
      <View style={styles.currentBatchLeft}>
        <Text style={styles.currentBatchLabel}>CURRENT BATCH</Text>
        <Text style={styles.currentBatchMed}>
          {result?.medication || 'Scheduled medication'}
          {result?.dosage ? ` ${result.dosage}` : ''}
        </Text>
      </View>
      <CheckCircle size={24} color="#3B5BDB" />
    </View>

    <TouchableOpacity style={styles.doneButton} onPress={onDone}>
      <Text style={styles.doneButtonText}>Done</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.verifyAnotherButton} onPress={onDone}>
      <Text style={styles.verifyAnotherText}>Verify another dose</Text>
    </TouchableOpacity>
    <View style={{height: 40}} />
  </ScrollView>
);

const FailedState = ({onRetry, onOverride, message}) => (
  <ScrollView style={styles.container}>
    <View style={styles.failedHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>!</Text>
      </View>
      <Text style={styles.failedHeaderTitle}>Verify & Dispense</Text>
      <View style={styles.circle} />
    </View>

    <View style={styles.failedContent}>
      <View style={styles.failedCircle}>
        <XCircle size={50} color="#991B1B" />
      </View>
      <Text style={styles.failedTitle}>Request Failed</Text>
      <Text style={styles.failedSub}>
        {message || 'Could not reach the PillSafe hub.'}
      </Text>
    </View>

    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <RefreshCw size={18} color="#FFFFFF" />
      <Text style={styles.retryButtonText}>Try Again</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.overrideButton} onPress={onOverride}>
      <Key size={18} color="#3B5BDB" />
      <Text style={styles.overrideButtonText}>Pick another dose</Text>
    </TouchableOpacity>
    <Text style={styles.failedHint}>
      Check Device Connection settings, Wi-Fi, and that the hub is running.
    </Text>
    <View style={{height: 40}} />
  </ScrollView>
);

const StepItem = ({icon, title, subtitle, status}) => (
  <View style={styles.stepItem}>
    {icon}
    <View style={styles.stepInfo}>
      <Text
        style={[
          styles.stepTitle,
          status === 'active' && {color: '#3B5BDB'},
          status === 'pending' && {color: '#9CA3AF'},
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.stepSubtitle,
          status === 'pending' && {color: '#D1D5DB'},
        ]}>
        {subtitle}
      </Text>
    </View>
  </View>
);

const LogItem = ({label, status}) => (
  <View style={styles.logItem}>
    <CheckCircle size={16} color="#10B981" />
    <Text style={styles.logLabel}>{label}</Text>
    <Text style={styles.logStatus}>{status}</Text>
  </View>
);

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
    marginBottom: 20,
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
    fontSize: 16,
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
  readyContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  readyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  readySub: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  errorHint: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  doseList: {
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  doseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  doseCardSelected: {
    borderColor: '#3B5BDB',
    backgroundColor: '#EEF2FF',
  },
  doseCardText: {flex: 1},
  doseName: {fontSize: 15, fontWeight: '700', color: '#111827'},
  doseMeta: {fontSize: 12, color: '#6B7280', marginTop: 2},
  faceFrame: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  faceFrameCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#3B5BDB',
  },
  faceFrameCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#3B5BDB',
  },
  faceFrameCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#3B5BDB',
  },
  faceFrameCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#3B5BDB',
  },
  faceCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanButtonDisabled: {opacity: 0.5},
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  voiceButton: {
    borderWidth: 1.5,
    borderColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  voiceButtonText: {
    color: '#3B5BDB',
    fontSize: 15,
    fontWeight: '600',
  },
  scanningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    marginBottom: 20,
  },
  pillSafeLogo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  scanningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  scanningSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  scanCircleOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 30,
  },
  scanCircleMiddle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: '#A5B4FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  stepDivider: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 10,
  },
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 24,
  },
  logoBadge: {
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  successContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#065F46',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  successSub: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  verificationLogs: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  logsTitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  logLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  logStatus: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  currentBatch: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B5BDB',
  },
  currentBatchLeft: {
    flex: 1,
  },
  currentBatchLabel: {
    fontSize: 11,
    color: '#3B5BDB',
    fontWeight: '600',
    letterSpacing: 1,
  },
  currentBatchMed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  doneButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyAnotherButton: {
    borderWidth: 1.5,
    borderColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyAnotherText: {
    color: '#3B5BDB',
    fontSize: 16,
    fontWeight: '600',
  },
  failedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    marginBottom: 24,
  },
  failedHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3B5BDB',
  },
  failedContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  failedCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  failedSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  retryButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overrideButton: {
    borderWidth: 1.5,
    borderColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  overrideButtonText: {
    color: '#3B5BDB',
    fontSize: 15,
    fontWeight: '600',
  },
  failedHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default VerifyScreen;

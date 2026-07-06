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
  CheckCircle,
  XCircle,
  RefreshCw,
  Key,
  Camera,
  ScanFace,
  Mic,
} from 'lucide-react-native';

const VerifyScreen = ({ navigation }) => {
  const [verifyState, setVerifyState] = useState('ready');

  const startScan = () => {
    setVerifyState('scanning');
    setTimeout(() => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        setVerifyState(success ? 'success' : 'failed');
      }, 3000);
    }, 2000);
  };

  const reset = () => setVerifyState('ready');

  if (verifyState === 'ready') return <ReadyState onScan={startScan} navigation={navigation} />;
  if (verifyState === 'scanning') return <ScanningState />;
  if (verifyState === 'success') return <SuccessState onDone={reset} />;
  if (verifyState === 'failed') return <FailedState onRetry={startScan} onOverride={reset} />;
};

// Ready State
const ReadyState = ({ onScan, navigation }) => (
  <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.userName}>Maxwell</Text>
        </View>
      </View>
      <Bell size={24} color="#374151" />
    </View>

    <View style={styles.readyContent}>
      <Text style={styles.readyTitle}>Ready to Dispense?</Text>
      <Text style={styles.readySub}>Morning dosage: 2 pills remaining</Text>

      <View style={styles.faceFrame}>
        <View style={styles.faceFrameCornerTL} />
        <View style={styles.faceFrameCornerTR} />
        <View style={styles.faceFrameCornerBL} />
        <View style={styles.faceFrameCornerBR} />
        <View style={styles.faceCircle}>
          <ScanFace size={60} color="#C7D2FE" />
        </View>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={onScan}>
        <Camera size={20} color="#FFFFFF" />
        <Text style={styles.scanButtonText}>Scan My Face</Text>
      </TouchableOpacity>
      <Text style={styles.scanHint}>Look directly into the dispenser camera</Text>
      <TouchableOpacity
        style={styles.voiceButton}
        onPress={() => navigation.navigate('VoiceVerify')}>
        <Mic size={20} color="#3B5BDB" />
        <Text style={styles.voiceButtonText}>Use Voice Instead</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Scanning State
const ScanningState = () => (
  <ScrollView style={styles.container}>
    <View style={styles.scanningHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>M</Text>
      </View>
      <Text style={styles.pillSafeLogo}>PillSafe</Text>
    </View>

    <Text style={styles.scanningTitle}>Verify & Dispense</Text>
    <Text style={styles.scanningSubtitle}>
      Verification is performed by the Pi camera.{'\n'}
      Your app is sending the request{'\n'}to start the Pi capture.
    </Text>

    <View style={styles.scanCircleOuter}>
      <View style={styles.scanCircleMiddle}>
        <View style={styles.scanCircleInner}>
          <ScanFace size={50} color="#A5B4FC" />
        </View>
      </View>
    </View>

    <View style={styles.stepsList}>
      <StepItem
        icon={<CheckCircle size={22} color="#10B981" />}
        title="Scanning face"
        subtitle="Biometric data captured successfully"
        status="done"
      />
      <View style={styles.stepDivider} />
      <StepItem
        icon={<RefreshCw size={22} color="#3B5BDB" />}
        title="Matching embeddings"
        subtitle="Verifying profile against database..."
        status="active"
      />
      <View style={styles.stepDivider} />
      <StepItem
        icon={<CheckCircle size={22} color="#D1D5DB" />}
        title="Rotating carousel"
        subtitle="Aligning medication cartridge"
        status="pending"
      />
      <View style={styles.stepDivider} />
      <StepItem
        icon={<CheckCircle size={22} color="#D1D5DB" />}
        title="Waiting for pickup"
        subtitle="Open the dispense tray when ready"
        status="pending"
      />
    </View>
    <View style={{ height: 40 }} />
  </ScrollView>
);

// Success State
const SuccessState = ({ onDone }) => (
  <ScrollView style={styles.container}>
    <View style={styles.successHeader}>
      <View style={styles.headerLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.userName}>Maxwell</Text>
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
      <Text style={styles.successTitle}>Identity Confirmed</Text>
      <Text style={styles.successSub}>Welcome, Maxwell.</Text>
      <View style={styles.confidenceScore}>
        <Text style={styles.confidenceLabel}>CONFIDENCE SCORE </Text>
        <Text style={styles.confidenceValue}>distance: 0.21</Text>
      </View>
    </View>

    <View style={styles.verificationLogs}>
      <Text style={styles.logsTitle}>VERIFICATION LOGS</Text>
      <LogItem label="Scanning face" status="SUCCESS" />
      <LogItem label="Matching embeddings" status="SUCCESS" />
      <LogItem label="Rotating carousel" status="ENGAGED" />
      <View style={styles.pickupRow}>
        <CheckCircle size={18} color="#3B5BDB" />
        <Text style={styles.pickupText}>Ready for pickup</Text>
        <View style={styles.pickupDot} />
      </View>
    </View>

    <View style={styles.currentBatch}>
      <View style={styles.currentBatchLeft}>
        <Text style={styles.currentBatchLabel}>CURRENT BATCH</Text>
        <Text style={styles.currentBatchMed}>Atorvastatin 20mg</Text>
      </View>
      <CheckCircle size={24} color="#3B5BDB" />
    </View>

    <TouchableOpacity style={styles.doneButton} onPress={onDone}>
      <Text style={styles.doneButtonText}>Done</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.verifyAnotherButton} onPress={onDone}>
      <Text style={styles.verifyAnotherText}>Verify another</Text>
    </TouchableOpacity>
    <View style={{ height: 40 }} />
  </ScrollView>
);

// Failed State
const FailedState = ({ onRetry, onOverride }) => (
  <ScrollView style={styles.container}>
    <View style={styles.failedHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>JD</Text>
      </View>
      <Text style={styles.failedHeaderTitle}>Verify & Dispense</Text>
      <View style={styles.circle} />
    </View>

    <View style={styles.failedContent}>
      <View style={styles.failedCircle}>
        <XCircle size={50} color="#991B1B" />
      </View>
      <Text style={styles.failedTitle}>Verification Failed</Text>
      <Text style={styles.failedSub}>Face not recognized. Caregiver notified.</Text>
    </View>

    <View style={styles.analysisSummary}>
      <Text style={styles.analysisTitle}>ANALYSIS SUMMARY</Text>
      <View style={styles.analysisItem}>
        <CheckCircle size={18} color="#10B981" />
        <Text style={styles.analysisLabel}>Scanning face</Text>
        <CheckCircle size={18} color="#10B981" />
      </View>
      <View style={styles.analysisDivider} />
      <View style={styles.analysisItem}>
        <XCircle size={18} color="#EF4444" />
        <Text style={styles.analysisLabel}>Matching embeddings</Text>
        <XCircle size={18} color="#EF4444" />
      </View>
    </View>

    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <RefreshCw size={18} color="#FFFFFF" />
      <Text style={styles.retryButtonText}>Try Again</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.overrideButton} onPress={onOverride}>
      <Key size={18} color="#3B5BDB" />
      <Text style={styles.overrideButtonText}>Manual Override (Caregiver)</Text>
    </TouchableOpacity>
    <Text style={styles.failedHint}>
      Having trouble? Ensure your face is well-lit and clearly visible.
    </Text>
    <View style={{ height: 40 }} />
  </ScrollView>
);

const StepItem = ({ icon, title, subtitle, status }) => (
  <View style={styles.stepItem}>
    {icon}
    <View style={styles.stepInfo}>
      <Text style={[
        styles.stepTitle,
        status === 'active' && { color: '#3B5BDB' },
        status === 'pending' && { color: '#9CA3AF' },
      ]}>
        {title}
      </Text>
      <Text style={[
        styles.stepSubtitle,
        status === 'pending' && { color: '#D1D5DB' },
      ]}>
        {subtitle}
      </Text>
    </View>
  </View>
);

const LogItem = ({ label, status }) => (
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
    paddingTop: 20,
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
    marginBottom: 40,
  },
  faceFrame: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
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
    width: 160,
    height: 160,
    borderRadius: 80,
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
    paddingHorizontal: 60,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanHint: {
    fontSize: 13,
    color: '#6B7280',
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
  },
  confidenceScore: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  confidenceValue: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: 'bold',
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
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    gap: 12,
  },
  pickupText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B5BDB',
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
  },
  analysisSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  analysisTitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  analysisDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  analysisLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
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
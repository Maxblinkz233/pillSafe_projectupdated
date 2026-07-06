import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import {
  Mic,
  MicOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  ScanFace,
} from 'lucide-react-native';

const PASSPHRASE = 'PillSafe authorize';

const VoiceEnrollScreen = ({ navigation }) => {
  // step: 'record1' | 'confirm' | 'processing' | 'done' | 'mismatch'
  const [step, setStep] = useState('record1');
  const [listenState, setListenState] = useState('idle'); // idle | listening | processing
  const [recordCount, setRecordCount] = useState(0);

  const bars = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.3))
  ).current;

  const animateWave = () => {
    bars.forEach(bar => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: Math.random() * 0.7 + 0.3,
            duration: Math.random() * 300 + 200,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: Math.random() * 300 + 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const stopWave = () => {
    bars.forEach(bar => {
      bar.stopAnimation();
      Animated.timing(bar, { toValue: 0.3, duration: 200, useNativeDriver: true }).start();
    });
  };

  const startRecording = () => {
    setListenState('listening');
    animateWave();

    setTimeout(() => {
      stopWave();
      setListenState('processing');

      setTimeout(() => {
        const newCount = recordCount + 1;
        setRecordCount(newCount);
        setListenState('idle');

        if (newCount === 1) {
          setStep('confirm');
        } else {
          // Simulate match (80% success rate)
          if (Math.random() > 0.2) {
            setStep('done');
          } else {
            setStep('mismatch');
          }
        }
      }, 1200);
    }, 3000);
  };

  const reset = () => {
    setStep('record1');
    setRecordCount(0);
    setListenState('idle');
    stopWave();
  };

  const isListening = listenState === 'listening';
  const isProcessing = listenState === 'processing';

  const stepLabel =
    step === 'record1' ? 'Recording 1 of 2'
    : step === 'confirm' ? 'Recording 2 of 2 — Confirm'
    : step === 'processing' ? 'Comparing recordings...'
    : step === 'done' ? 'Voice enrolled!'
    : 'Recordings did not match';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
      </View>

      {/* Progress Steps — step 4 active */}
      <View style={styles.progressRow}>
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepDone]}>
            <CheckCircle size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>PERSONAL</Text>
        </View>
        <View style={styles.progressLineDone} />
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepDone]}>
            <CheckCircle size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>SLOT{'\n'}SELECT</Text>
        </View>
        <View style={styles.progressLineDone} />
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepDone]}>
            <ScanFace size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>FACE{'\n'}SCAN</Text>
        </View>
        <View style={styles.progressLineDone} />
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <Mic size={16} color="#3B5BDB" />
          </View>
          <Text style={[styles.stepLabel, { color: '#3B5BDB' }]}>VOICE{'\n'}ENROLL</Text>
        </View>
      </View>

      <Text style={styles.title}>Voice Enrollment</Text>
      <Text style={styles.subtitle}>
        Say the passphrase below clearly — you'll record it twice to confirm.
      </Text>

      {/* Passphrase card */}
      <View style={styles.passphraseCard}>
        <Text style={styles.passphraseLabel}>SAY THIS PASSPHRASE</Text>
        <Text style={styles.passphrase}>"{PASSPHRASE}"</Text>
      </View>

      {/* Recording progress pills */}
      <View style={styles.pillRow}>
        <View style={[styles.pill, recordCount >= 1 && styles.pillDone]}>
          {recordCount >= 1 ? (
            <CheckCircle size={14} color="#065F46" />
          ) : (
            <Text style={styles.pillNum}>1</Text>
          )}
          <Text style={[styles.pillLabel, recordCount >= 1 && styles.pillLabelDone]}>
            First recording
          </Text>
        </View>
        <View style={[styles.pill, step === 'done' && styles.pillDone]}>
          {step === 'done' ? (
            <CheckCircle size={14} color="#065F46" />
          ) : (
            <Text style={styles.pillNum}>2</Text>
          )}
          <Text style={[styles.pillLabel, step === 'done' && styles.pillLabelDone]}>
            Confirm recording
          </Text>
        </View>
      </View>

      {/* Visualizer */}
      <View style={styles.visualizer}>
        <View style={[
          styles.micOuter,
          isListening && styles.micOuterActive,
          step === 'done' && styles.micOuterDone,
          step === 'mismatch' && styles.micOuterFail,
        ]}>
          <View style={[
            styles.micInner,
            isListening && styles.micInnerActive,
            step === 'done' && styles.micInnerDone,
            step === 'mismatch' && styles.micInnerFail,
          ]}>
            {step === 'done' ? (
              <CheckCircle size={36} color="#FFFFFF" />
            ) : step === 'mismatch' ? (
              <XCircle size={36} color="#FFFFFF" />
            ) : (
              <Mic size={36} color={isListening ? '#FFFFFF' : '#3B5BDB'} />
            )}
          </View>
        </View>

        <View style={styles.waveform}>
          {bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  transform: [{ scaleY: bar }],
                  backgroundColor: isListening ? '#3B5BDB'
                    : step === 'done' ? '#10B981'
                    : step === 'mismatch' ? '#EF4444'
                    : '#D1D5DB',
                },
              ]}
            />
          ))}
        </View>

        <Text style={[
          styles.stepStatus,
          isListening && { color: '#3B5BDB' },
          step === 'done' && { color: '#10B981' },
          step === 'mismatch' && { color: '#EF4444' },
        ]}>
          {isListening ? 'Listening... Speak now'
            : isProcessing ? 'Processing...'
            : stepLabel}
        </Text>
      </View>

      {/* Result cards */}
      {step === 'done' && (
        <View style={styles.successCard}>
          <CheckCircle size={20} color="#065F46" />
          <View style={{ flex: 1 }}>
            <Text style={styles.successTitle}>Voice Enrolled!</Text>
            <Text style={styles.successSub}>Your voice passphrase has been saved.</Text>
          </View>
        </View>
      )}

      {step === 'mismatch' && (
        <View style={styles.failCard}>
          <XCircle size={20} color="#991B1B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.failTitle}>Recordings Didn't Match</Text>
            <Text style={styles.failSub}>Please try again and speak clearly.</Text>
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {(step === 'record1' || step === 'confirm') && listenState === 'idle' && (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <Mic size={20} color="#FFFFFF" />
            <Text style={styles.recordButtonText}>
              {step === 'record1' ? 'RECORD PASSPHRASE' : 'RECORD AGAIN TO CONFIRM'}
            </Text>
          </TouchableOpacity>
        )}

        {isListening && (
          <TouchableOpacity style={styles.stopButton} onPress={() => { stopWave(); setListenState('idle'); }}>
            <MicOff size={20} color="#FFFFFF" />
            <Text style={styles.stopButtonText}>STOP</Text>
          </TouchableOpacity>
        )}

        {isProcessing && (
          <View style={styles.processingButton}>
            <RefreshCw size={18} color="#FFFFFF" />
            <Text style={styles.processingButtonText}>PROCESSING...</Text>
          </View>
        )}

        {step === 'done' && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('EnrollSuccess')}>
            <Text style={styles.continueButtonText}>COMPLETE ENROLLMENT →</Text>
          </TouchableOpacity>
        )}

        {step === 'mismatch' && (
          <TouchableOpacity style={styles.retryButton} onPress={reset}>
            <RefreshCw size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Back */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← BACK</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 50, marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3B5BDB', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  patientLabel: { fontSize: 11, color: '#6B7280' },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  logoBadge: {
    flexDirection: 'row', backgroundColor: '#3B5BDB',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  logoTextPill: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  logoTextSafe: { fontSize: 14, fontWeight: 'bold', color: '#A5F3FC' },
  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: 28, gap: 2,
  },
  progressStep: { alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  stepDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  stepActive: { borderColor: '#3B5BDB', backgroundColor: '#EEF2FF' },
  stepLabel: { fontSize: 9, color: '#6B7280', fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
  progressLineDone: { width: 24, height: 2, backgroundColor: '#10B981', marginBottom: 22 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  passphraseCard: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#C7D2FE',
  },
  passphraseLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  passphrase: { fontSize: 18, fontWeight: 'bold', color: '#3B5BDB' },
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pillDone: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' },
  pillNum: { fontSize: 13, fontWeight: 'bold', color: '#9CA3AF' },
  pillLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  pillLabelDone: { color: '#065F46' },
  visualizer: { alignItems: 'center', marginBottom: 20 },
  micOuter: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  micOuterActive: { backgroundColor: 'rgba(59, 91, 219, 0.15)' },
  micOuterDone: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  micOuterFail: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  micInner: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  micInnerActive: { backgroundColor: '#3B5BDB', borderColor: '#3B5BDB' },
  micInnerDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  micInnerFail: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 50, marginBottom: 12 },
  waveBar: { width: 6, height: 36, borderRadius: 3 },
  stepStatus: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  successCard: {
    backgroundColor: '#D1FAE5', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0',
  },
  successTitle: { fontSize: 15, fontWeight: 'bold', color: '#065F46' },
  successSub: { fontSize: 13, color: '#047857', marginTop: 2 },
  failCard: {
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#FECACA',
  },
  failTitle: { fontSize: 15, fontWeight: 'bold', color: '#991B1B' },
  failSub: { fontSize: 13, color: '#B91C1C', marginTop: 2 },
  actions: { gap: 12, marginBottom: 16 },
  recordButton: {
    backgroundColor: '#3B5BDB', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  recordButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  stopButton: {
    backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  stopButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  processingButton: {
    backgroundColor: '#6B7280', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  processingButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
  continueButton: {
    backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5 },
  retryButton: {
    backgroundColor: '#3B5BDB', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  backButton: { alignItems: 'center', paddingVertical: 12 },
  backButtonText: { fontSize: 13, color: '#3B5BDB', fontWeight: '700', letterSpacing: 1 },
});

export default VoiceEnrollScreen;

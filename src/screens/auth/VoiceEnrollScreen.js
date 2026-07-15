import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Mic, CheckCircle, XCircle, RefreshCw} from 'lucide-react-native';
import {getApiConfig} from '../../services/config';
import {api, initials} from '../../services/api';

const FALLBACK_PROMPTS = [
  'open my medicine',
  'dispense my pills',
  'pillsafe unlock',
];

const VoiceEnrollScreen = ({navigation}) => {
  const [userName, setUserName] = useState('Patient');
  const [userId, setUserId] = useState(null);
  const [prompt, setPrompt] = useState(FALLBACK_PROMPTS[0]);
  const [step, setStep] = useState('ready'); // ready | enrolling | done | error
  const [statusText, setStatusText] = useState(
    'Speak into the PillSafe hub microphone when enrolment starts.',
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const cfg = await getApiConfig();
      if (!active) return;
      setUserName(cfg.userName || 'Patient');
      setUserId(cfg.userId);
      try {
        const challenge = await api.getVoiceChallenge();
        if (challenge?.prompt) setPrompt(challenge.prompt);
      } catch {
        setPrompt(FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const startEnrolment = async () => {
    if (!userId) {
      Alert.alert(
        'No user selected',
        'Create a patient first, or pick one in Device Connection.',
      );
      return;
    }

    setStep('enrolling');
    setErrorMessage('');
    setStatusText(
      `Speak clearly into the hub mic — practise with: "${prompt}"`,
    );

    try {
      await api.enrolVoice(userId);
      const status = await api.getEnrolStatus(userId);
      if (!status?.voice_enrolled) {
        throw new Error('Hub finished but voice_enrolled is still false.');
      }
      setStep('done');
      setStatusText('Voice template saved on the hub.');
    } catch (err) {
      setStep('error');
      setErrorMessage(err.message || String(err));
      setStatusText('Voice enrolment failed.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
      </View>

      <Text style={styles.title}>Voice Enrolment (Hub)</Text>
      <Text style={styles.subtitle}>
        The hub microphone records several samples. This phone only starts the
        process — speak at the dispenser.
      </Text>

      <View style={styles.passphraseCard}>
        <Text style={styles.passphraseLabel}>PRACTICE PHRASE</Text>
        <Text style={styles.passphrase}>"{prompt}"</Text>
      </View>

      <View style={styles.visualizer}>
        <View
          style={[
            styles.micOuter,
            step === 'done' && styles.micOuterDone,
            step === 'error' && styles.micOuterFail,
            step === 'enrolling' && styles.micOuterActive,
          ]}>
          <View
            style={[
              styles.micInner,
              step === 'done' && styles.micInnerDone,
              step === 'error' && styles.micInnerFail,
              step === 'enrolling' && styles.micInnerActive,
            ]}>
            {step === 'done' ? (
              <CheckCircle size={36} color="#FFFFFF" />
            ) : step === 'error' ? (
              <XCircle size={36} color="#FFFFFF" />
            ) : step === 'enrolling' ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <Mic size={36} color="#3B5BDB" />
            )}
          </View>
        </View>
        <Text style={styles.stepStatus}>{statusText}</Text>
        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      {(step === 'ready' || step === 'error') && (
        <TouchableOpacity style={styles.recordButton} onPress={startEnrolment}>
          {step === 'error' ? (
            <RefreshCw size={20} color="#FFFFFF" />
          ) : (
            <Mic size={20} color="#FFFFFF" />
          )}
          <Text style={styles.recordButtonText}>
            {step === 'error' ? 'TRY AGAIN ON HUB' : 'START HUB VOICE ENROLMENT'}
          </Text>
        </TouchableOpacity>
      )}

      {step === 'enrolling' && (
        <View style={styles.processingButton}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.processingButtonText}>ENROLLING ON HUB…</Text>
        </View>
      )}

      {step === 'done' && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('EnrollSuccess')}>
          <Text style={styles.continueButtonText}>COMPLETE ENROLLMENT →</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← BACK</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6'},
  content: {paddingHorizontal: 20, paddingBottom: 40},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 24,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  patientLabel: {fontSize: 11, color: '#6B7280'},
  userName: {fontSize: 15, fontWeight: 'bold', color: '#111827'},
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoTextPill: {fontSize: 14, fontWeight: 'bold', color: '#FFFFFF'},
  logoTextSafe: {fontSize: 14, fontWeight: 'bold', color: '#A5F3FC'},
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  passphraseCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  passphraseLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  passphrase: {fontSize: 18, fontWeight: 'bold', color: '#3B5BDB'},
  visualizer: {alignItems: 'center', marginBottom: 24, gap: 12},
  micOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOuterActive: {backgroundColor: 'rgba(59, 91, 219, 0.15)'},
  micOuterDone: {backgroundColor: 'rgba(16, 185, 129, 0.15)'},
  micOuterFail: {backgroundColor: 'rgba(239, 68, 68, 0.15)'},
  micInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  micInnerActive: {backgroundColor: '#3B5BDB', borderColor: '#3B5BDB'},
  micInnerDone: {backgroundColor: '#10B981', borderColor: '#10B981'},
  micInnerFail: {backgroundColor: '#EF4444', borderColor: '#EF4444'},
  stepStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  errorText: {fontSize: 13, color: '#B91C1C', textAlign: 'center'},
  recordButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  processingButton: {
    backgroundColor: '#6B7280',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  processingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  continueButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  backButton: {alignItems: 'center', paddingVertical: 12},
  backButtonText: {
    fontSize: 13,
    color: '#3B5BDB',
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default VoiceEnrollScreen;

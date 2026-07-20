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
import {CheckCircle, ScanFace, Camera as CameraIcon} from 'lucide-react-native';
import {getApiConfig} from '../../services/config';
import {api, initials} from '../../services/api';

const FaceEnrollScreen = ({navigation}) => {
  const [userName, setUserName] = useState('Patient');
  const [userId, setUserId] = useState(null);
  const [enrollState, setEnrollState] = useState('ready'); // ready | scanning | done | error
  const [statusText, setStatusText] = useState(
    'Stand in front of the PillSafe hub camera, then start enrolment.',
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const cfg = await getApiConfig();
      if (!active) return;
      setUserName(cfg.userName || 'Patient');
      setUserId(cfg.userId);
    })();
    return () => {
      active = false;
    };
  }, []);

  const startEnrollment = async () => {
    if (!userId) {
      Alert.alert(
        'No user selected',
        'Create a patient first, or pick one in Device Connection.',
      );
      return;
    }

    setEnrollState('scanning');
    setErrorMessage('');
    setStatusText(
      'Capturing on the hub… look at the dispenser camera and hold still.',
    );

    try {
      await api.enrolFace(userId);
      const status = await api.getEnrolStatus(userId);
      if (!status?.face_enrolled) {
        throw new Error('Hub finished but face_enrolled is still false.');
      }
      setEnrollState('done');
      setStatusText('Face enrolled on the hub successfully.');
    } catch (err) {
      setEnrollState('error');
      setErrorMessage(err.message || String(err));
      setStatusText('Face enrolment failed.');
    }
  };

  const goNextAfterFace = async () => {
    try {
      const status = await api.getEnrolStatus(userId);
      if (status?.voice_enabled) {
        navigation.navigate('VoiceEnroll');
      } else {
        navigation.navigate('EnrollSuccess');
      }
    } catch {
      // PC / voice-off hub: face-only is enough to finish registration
      navigation.navigate('EnrollSuccess');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      <Text style={styles.title}>Face Enrolment (Hub)</Text>
      <Text style={styles.subtitle}>
        Biometrics are captured by the Raspberry Pi camera — not this phone.
        Stand in front of the dispenser when you tap Start.
      </Text>

      <View style={styles.card}>
        <ScanFace
          size={72}
          color={
            enrollState === 'done'
              ? '#10B981'
              : enrollState === 'error'
                ? '#EF4444'
                : '#3B5BDB'
          }
        />
        <Text style={styles.statusText}>{statusText}</Text>
        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.startButton,
          enrollState === 'scanning' && styles.startButtonScanning,
          enrollState === 'done' && styles.startButtonDone,
        ]}
        onPress={startEnrollment}
        disabled={enrollState === 'scanning'}>
        {enrollState === 'scanning' ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : enrollState === 'done' ? (
          <CheckCircle size={16} color="#FFFFFF" />
        ) : (
          <CameraIcon size={16} color="#FFFFFF" />
        )}
        <Text style={styles.startButtonText}>
          {enrollState === 'ready' || enrollState === 'error'
            ? 'START HUB FACE ENROLMENT'
            : enrollState === 'scanning'
              ? 'ENROLLING ON HUB…'
              : 'FACE ENROLLED'}
        </Text>
      </TouchableOpacity>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.awaitingButton,
            enrollState === 'done' && styles.awaitingButtonDone,
          ]}
          onPress={() => {
            if (enrollState === 'done') goNextAfterFace();
          }}
          disabled={enrollState !== 'done'}>
          <Text
            style={
              enrollState === 'done'
                ? styles.awaitingTextDone
                : styles.awaitingText
            }>
            {enrollState === 'done' ? 'CONTINUE →' : 'AWAITING FACE ENROL'}
          </Text>
        </TouchableOpacity>
      </View>

      {enrollState === 'done' && (
        <TouchableOpacity style={styles.skipLink} onPress={goNextAfterFace}>
          <Text style={styles.skipLinkText}>
            Voice is optional on PC — continue when face is enrolled
          </Text>
        </TouchableOpacity>
      )}

      {(enrollState === 'error' || enrollState === 'ready') && (
        <TouchableOpacity
          style={styles.skipFaceButton}
          onPress={() => navigation.navigate('EnrollSuccess')}>
          <Text style={styles.skipFaceText}>
            SKIP BIOMETRICS FOR NOW →
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    minHeight: 220,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {fontSize: 13, color: '#FCA5A5', textAlign: 'center'},
  startButton: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  startButtonScanning: {backgroundColor: '#1E40AF'},
  startButtonDone: {backgroundColor: '#10B981'},
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 13,
    color: '#3B5BDB',
    fontWeight: '700',
    letterSpacing: 1,
  },
  awaitingButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  awaitingButtonDone: {backgroundColor: '#3B5BDB', borderColor: '#3B5BDB'},
  awaitingText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  awaitingTextDone: {fontSize: 14, color: '#FFFFFF', fontWeight: 'bold'},
  skipLink: {alignItems: 'center', marginTop: 16, paddingHorizontal: 12},
  skipLinkText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  skipFaceButton: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipFaceText: {
    color: '#3B5BDB',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default FaceEnrollScreen;

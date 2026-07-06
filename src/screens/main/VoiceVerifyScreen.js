import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import {
  Mic,
  MicOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  Key,
  ChevronLeft,
} from 'lucide-react-native';

const PASSPHRASE = 'PillSafe authorize';

const VoiceVerifyScreen = ({ navigation }) => {
  const [voiceState, setVoiceState] = useState('idle');
  // States: idle, listening, processing, success, failed
  const [transcript, setTranscript] = useState('');
  const [countdown, setCountdown] = useState(3);

  // Animated values for waveform bars
  const bars = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.3))
  ).current;

  const animateWave = () => {
    const animations = bars.map(bar =>
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
      )
    );
    animations.forEach(a => a.start());
    return animations;
  };

  const stopWave = () => {
    bars.forEach(bar => {
      bar.stopAnimation();
      Animated.timing(bar, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const startListening = () => {
    setVoiceState('listening');
    setTranscript('');
    const animations = animateWave();

    // Simulate listening for 3 seconds
    setTimeout(() => {
      stopWave();
      setVoiceState('processing');

      // Simulate transcript appearing
      setTimeout(() => {
        const success = Math.random() > 0.2;
        if (success) {
          setTranscript(PASSPHRASE);
          setTimeout(() => setVoiceState('success'), 1000);
        } else {
          setTranscript('PillSafe author...');
          setTimeout(() => setVoiceState('failed'), 1000);
        }
      }, 1500);
    }, 3000);
  };

  const reset = () => {
    setVoiceState('idle');
    setTranscript('');
    stopWave();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>Maxwell</Text>
          </View>
        </View>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
      </View>

      <Text style={styles.title}>Voice Verification</Text>
      <Text style={styles.subtitle}>
        Say the passphrase clearly into your microphone to verify your identity.
      </Text>

      {/* Passphrase Card */}
      <View style={styles.passphraseCard}>
        <Text style={styles.passphraseLabel}>YOUR PASSPHRASE</Text>
        <Text style={styles.passphrase}>"{PASSPHRASE}"</Text>
      </View>

      {/* Voice Visualizer */}
      <View style={styles.visualizerContainer}>
        {/* Mic Circle */}
        <View style={[
          styles.micCircleOuter,
          voiceState === 'listening' && styles.micCircleOuterActive,
        ]}>
          <View style={[
            styles.micCircleInner,
            voiceState === 'listening' && styles.micCircleInnerActive,
            voiceState === 'success' && styles.micCircleSuccess,
            voiceState === 'failed' && styles.micCircleFailed,
          ]}>
            {voiceState === 'success' ? (
              <CheckCircle size={40} color="#FFFFFF" />
            ) : voiceState === 'failed' ? (
              <XCircle size={40} color="#FFFFFF" />
            ) : voiceState === 'listening' ? (
              <Mic size={40} color="#FFFFFF" />
            ) : (
              <Mic size={40} color="#3B5BDB" />
            )}
          </View>
        </View>

        {/* Waveform */}
        <View style={styles.waveform}>
          {bars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveBar,
                {
                  transform: [{ scaleY: bar }],
                  backgroundColor:
                    voiceState === 'listening'
                      ? '#3B5BDB'
                      : voiceState === 'success'
                      ? '#10B981'
                      : voiceState === 'failed'
                      ? '#EF4444'
                      : '#D1D5DB',
                },
              ]}
            />
          ))}
        </View>

        {/* Status Text */}
        <Text style={[
          styles.statusText,
          voiceState === 'listening' && { color: '#3B5BDB' },
          voiceState === 'success' && { color: '#10B981' },
          voiceState === 'failed' && { color: '#EF4444' },
        ]}>
          {voiceState === 'idle' && 'Tap the button to start'}
          {voiceState === 'listening' && 'Listening... Speak now'}
          {voiceState === 'processing' && 'Processing voice...'}
          {voiceState === 'success' && 'Voice Matched!'}
          {voiceState === 'failed' && 'Voice Not Recognized'}
        </Text>

        {/* Transcript */}
        {transcript !== '' && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>HEARD:</Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
          </View>
        )}
      </View>

      {/* Result Cards */}
      {voiceState === 'success' && (
        <View style={styles.successCard}>
          <CheckCircle size={20} color="#065F46" />
          <View style={styles.successCardText}>
            <Text style={styles.successCardTitle}>Identity Confirmed</Text>
            <Text style={styles.successCardSub}>
              Voice pattern matched. Dispensing medication.
            </Text>
          </View>
        </View>
      )}

      {voiceState === 'failed' && (
        <View style={styles.failedCard}>
          <XCircle size={20} color="#991B1B" />
          <View style={styles.failedCardText}>
            <Text style={styles.failedCardTitle}>Verification Failed</Text>
            <Text style={styles.failedCardSub}>
              Voice not recognized. Please try again.
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {voiceState === 'idle' && (
          <TouchableOpacity style={styles.startButton} onPress={startListening}>
            <Mic size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>START VOICE VERIFICATION</Text>
          </TouchableOpacity>
        )}

        {voiceState === 'listening' && (
          <TouchableOpacity style={styles.stopButton} onPress={reset}>
            <MicOff size={20} color="#FFFFFF" />
            <Text style={styles.stopButtonText}>STOP LISTENING</Text>
          </TouchableOpacity>
        )}

        {voiceState === 'processing' && (
          <View style={styles.processingButton}>
            <RefreshCw size={20} color="#FFFFFF" />
            <Text style={styles.processingButtonText}>PROCESSING...</Text>
          </View>
        )}

        {voiceState === 'success' && (
          <>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.navigate('MainApp')}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryOutlineButton} onPress={reset}>
              <RefreshCw size={16} color="#3B5BDB" />
              <Text style={styles.retryOutlineText}>Verify Again</Text>
            </TouchableOpacity>
          </>
        )}

        {voiceState === 'failed' && (
          <>
            <TouchableOpacity style={styles.retryButton} onPress={startListening}>
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.overrideButton}>
              <Key size={18} color="#3B5BDB" />
              <Text style={styles.overrideButtonText}>
                Manual Override (Caregiver)
              </Text>
            </TouchableOpacity>
            <Text style={styles.hint}>
              Speak clearly and ensure you're in a quiet environment.
            </Text>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 24,
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
  headerCenter: {
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
  greeting: {
    fontSize: 12,
    color: '#6B7280',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoTextPill: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoTextSafe: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#A5F3FC',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
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
  passphrase: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B5BDB',
  },
  visualizerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  micCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  micCircleOuterActive: {
    backgroundColor: 'rgba(59, 91, 219, 0.15)',
  },
  micCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  micCircleInnerActive: {
    backgroundColor: '#3B5BDB',
    borderColor: '#3B5BDB',
  },
  micCircleSuccess: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  micCircleFailed: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 60,
    marginBottom: 16,
  },
  waveBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  transcriptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  successCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successCardText: {
    flex: 1,
  },
  successCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#065F46',
  },
  successCardSub: {
    fontSize: 13,
    color: '#047857',
    marginTop: 2,
  },
  failedCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  failedCardText: {
    flex: 1,
  },
  failedCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  failedCardSub: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 2,
  },
  actions: {
    gap: 12,
  },
  startButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stopButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stopButtonText: {
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
  },
  processingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  doneButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryOutlineButton: {
    borderWidth: 1.5,
    borderColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryOutlineText: {
    color: '#3B5BDB',
    fontSize: 15,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  overrideButtonText: {
    color: '#3B5BDB',
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default VoiceVerifyScreen;
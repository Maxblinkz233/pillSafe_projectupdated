import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import {
  CheckCircle,
  ScanFace,
  RefreshCw,
  Camera as CameraIcon,
  Zap,
} from 'lucide-react-native';

const FaceEnrollScreen = ({ navigation }) => {
  const [enrollState, setEnrollState] = useState('ready');
  const [progress, setProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);
  const scanLine = useRef(new Animated.Value(0)).current;
  const faceOpacity = useRef(new Animated.Value(0.3)).current;
  // Memoised once — recreating interpolation every render confuses the native driver
  const scanLineTranslate = useRef(
    scanLine.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] })
  ).current;
  const scanLineAnim = useRef(null);
  const faceAnim = useRef(null);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const scanSteps = [
    'Initializing camera...',
    'Face detected',
    'Capturing front view...',
    'Capturing left profile...',
    'Capturing right profile...',
    'Processing biometric data...',
    'Enrollment complete!',
  ];

  const stopAnimations = (callback) => {
    if (scanLineAnim.current) { scanLineAnim.current.stop(); scanLineAnim.current = null; }
    if (faceAnim.current) { faceAnim.current.stop(); faceAnim.current = null; }
    if (callback) callback();
  };

  const animateScanLine = () => {
    scanLineAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    scanLineAnim.current.start();
  };

  const animateFace = () => {
    faceAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(faceOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(faceOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    faceAnim.current.start();
  };

  const startEnrollment = () => {
    setEnrollState('scanning');
    setProgress(0);
    setScanStep(0);
    animateScanLine();
    animateFace();

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setScanStep(step);
      setProgress(Math.round((step / scanSteps.length) * 100));
      if (step >= scanSteps.length - 1) {
        clearInterval(interval);
        setTimeout(() => {
          // Stop animations FIRST — before the state update unmounts the Animated.View
          stopAnimations(() => setEnrollState('done'));
        }, 500);
      }
    }, 700);
  };

  const showCamera = hasPermission && device != null && enrollState !== 'done';

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      {/* Progress Steps — 4 steps */}
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
          <View style={[styles.stepCircle, styles.stepActive]}>
            <ScanFace size={16} color="#3B5BDB" />
          </View>
          <Text style={[styles.stepLabel, { color: '#3B5BDB' }]}>FACE{'\n'}SCAN</Text>
        </View>
        <View style={styles.progressLinePending} />
        <View style={styles.progressStep}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>4</Text>
          </View>
          <Text style={styles.stepLabel}>VOICE{'\n'}ENROLL</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Facial Verification Enroll</Text>
      <Text style={styles.subtitle}>
        Position your face in front of the camera and tap Start.
      </Text>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraHeader}>
          <View style={styles.recIndicator}>
            <View style={[styles.recDot, enrollState === 'scanning' && styles.recDotActive]} />
            <Text style={styles.recLabel}>FRONT{'\n'}CAM</Text>
          </View>
          <Text style={styles.resolution}>RES: 1080P // 30FPS</Text>
        </View>

        <View style={styles.cameraFeed}>
          {/* Real camera preview */}
          {showCamera && (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
            />
          )}

          {/* Permission denied state */}
          {!hasPermission && (
            <View style={styles.permissionBox}>
              <CameraIcon size={32} color="#6B7280" />
              <Text style={styles.permissionText}>Camera permission required</Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.permissionBtnText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Corner frames */}
          <View style={styles.cameraFrameCornerTL} />
          <View style={styles.cameraFrameCornerTR} />
          <View style={styles.cameraFrameCornerBL} />
          <View style={styles.cameraFrameCornerBR} />

          {/* Face outline overlay */}
          <Animated.View style={[styles.faceOutline, { opacity: faceOpacity }]}>
            <ScanFace
              size={100}
              color={
                enrollState === 'done' ? '#10B981'
                  : enrollState === 'scanning' ? '#3B5BDB'
                  : '#FFFFFF'
              }
            />
          </Animated.View>

          {/* Scan line — always mounted so native driver node stays alive */}
          <Animated.View
            style={[
              styles.scanLine,
              styles.scanLineAbsolute,
              { transform: [{ translateY: scanLineTranslate }] },
              enrollState !== 'scanning' && styles.hidden,
            ]}
          />

          {/* Done overlay */}
          {enrollState === 'done' && (
            <View style={styles.doneOverlay}>
              <CheckCircle size={50} color="#10B981" />
            </View>
          )}

          <View style={styles.gridH} />
          <View style={styles.gridV} />
        </View>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Zap size={14} color="#94A3B8" />
          <Text style={styles.statusText}>
            {enrollState === 'ready'
              ? hasPermission
                ? 'Camera ready. Tap Start to begin enrollment.'
                : 'Camera permission required to continue.'
              : enrollState === 'scanning'
              ? scanSteps[scanStep]
              : 'Face enrolled successfully!'}
          </Text>
        </View>

        {enrollState === 'scanning' && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={[
          styles.startButton,
          enrollState === 'scanning' && styles.startButtonScanning,
          enrollState === 'done' && styles.startButtonDone,
        ]}
        onPress={startEnrollment}
        disabled={enrollState === 'scanning' || !hasPermission}>
        {enrollState === 'done' ? (
          <CheckCircle size={16} color="#FFFFFF" />
        ) : enrollState === 'scanning' ? (
          <RefreshCw size={16} color="#FFFFFF" />
        ) : (
          <CameraIcon size={16} color="#FFFFFF" />
        )}
        <Text style={styles.startButtonText}>
          {enrollState === 'ready'
            ? 'START FACE ENROLLMENT'
            : enrollState === 'scanning'
            ? `SCANNING... ${progress}%`
            : 'ENROLLMENT COMPLETE'}
        </Text>
      </TouchableOpacity>

      {/* Bottom Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.awaitingButton, enrollState === 'done' && styles.awaitingButtonDone]}
          onPress={() => { if (enrollState === 'done') navigation.navigate('VoiceEnroll'); }}
          disabled={enrollState !== 'done'}>
          {enrollState !== 'done' ? (
            <Text style={styles.awaitingText}>AWAITING FACE{'\n'}BIOMETRICS</Text>
          ) : (
            <Text style={styles.awaitingTextDone}>NEXT: VOICE →</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
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
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  stepDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  stepActive: { borderColor: '#3B5BDB', backgroundColor: '#EEF2FF' },
  stepNumber: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF' },
  stepLabel: {
    fontSize: 9, color: '#6B7280', fontWeight: '600',
    textAlign: 'center', letterSpacing: 0.3,
  },
  progressLineDone: { width: 28, height: 2, backgroundColor: '#10B981', marginBottom: 22 },
  progressLinePending: { width: 28, height: 2, backgroundColor: '#D1D5DB', marginBottom: 22 },
  title: {
    fontSize: 20, fontWeight: 'bold', color: '#111827',
    marginBottom: 8, textAlign: 'center',
  },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  cameraContainer: {
    backgroundColor: '#0F172A', borderRadius: 16,
    overflow: 'hidden', marginBottom: 16,
  },
  cameraHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 12,
  },
  recIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4B5563' },
  recDotActive: { backgroundColor: '#EF4444' },
  recLabel: { fontSize: 11, color: '#FFFFFF', fontWeight: '600', lineHeight: 14 },
  resolution: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  cameraFeed: {
    height: 260, marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#1E293B', borderRadius: 8,
    position: 'relative', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  permissionBox: { alignItems: 'center', gap: 10 },
  permissionText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  permissionBtn: {
    backgroundColor: '#3B5BDB', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  permissionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  cameraFrameCornerTL: {
    position: 'absolute', top: 10, left: 10,
    width: 24, height: 24, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#3B5BDB',
  },
  cameraFrameCornerTR: {
    position: 'absolute', top: 10, right: 10,
    width: 24, height: 24, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#3B5BDB',
  },
  cameraFrameCornerBL: {
    position: 'absolute', bottom: 10, left: 10,
    width: 24, height: 24, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#3B5BDB',
  },
  cameraFrameCornerBR: {
    position: 'absolute', bottom: 10, right: 10,
    width: 24, height: 24, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#3B5BDB',
  },
  faceOutline: { alignItems: 'center', justifyContent: 'center' },
  scanLine: {
    width: '80%', height: 2,
    backgroundColor: '#3B5BDB', opacity: 0.8,
  },
  scanLineAbsolute: { position: 'absolute' },
  hidden: { opacity: 0 },
  doneOverlay: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)', width: '100%', height: '100%',
  },
  gridH: {
    position: 'absolute', width: '100%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gridV: {
    position: 'absolute', width: 1, height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B', margin: 12, borderRadius: 8, padding: 10, gap: 8,
  },
  statusText: { fontSize: 12, color: '#94A3B8', fontWeight: '500', flex: 1 },
  progressBarContainer: {
    height: 4, backgroundColor: '#1E293B',
    marginHorizontal: 12, marginBottom: 12, borderRadius: 2, overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#3B5BDB', borderRadius: 2 },
  startButton: {
    backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 16,
  },
  startButtonScanning: { backgroundColor: '#1E40AF' },
  startButtonDone: { backgroundColor: '#10B981' },
  startButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  backButton: {
    paddingVertical: 14, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  backButtonText: { fontSize: 13, color: '#3B5BDB', fontWeight: '700', letterSpacing: 1 },
  awaitingButton: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  awaitingButtonDone: { backgroundColor: '#3B5BDB', borderColor: '#3B5BDB' },
  awaitingText: {
    fontSize: 12, color: '#9CA3AF', fontWeight: '600',
    textAlign: 'center', letterSpacing: 0.5,
  },
  awaitingTextDone: { fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' },
});

export default FaceEnrollScreen;

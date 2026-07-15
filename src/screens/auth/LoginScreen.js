import React, {useState} from 'react';
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
import {Wifi, Users} from 'lucide-react-native';
import {getApiConfig} from '../../services/config';
import {api} from '../../services/api';

const LoginScreen = ({navigation}) => {
  const [loading, setLoading] = useState(false);

  const enterApp = async ({requireUser}) => {
    setLoading(true);
    try {
      const cfg = await getApiConfig();
      if (requireUser && !cfg.userId) {
        Alert.alert(
          'Select a patient',
          'Open Settings → Device Connection, test the hub, and pick a user.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Device Connection',
              onPress: () => navigation.navigate('DeviceConnection'),
            },
          ],
        );
        return;
      }
      try {
        await api.health();
      } catch (err) {
        Alert.alert(
          'Hub offline',
          err.message ||
            'Cannot reach the PillSafe hub. Check Wi-Fi / Device Connection.',
          [
            {text: 'Continue offline', onPress: () => navigation.replace('MainApp')},
            {
              text: 'Device Connection',
              onPress: () => navigation.navigate('DeviceConnection'),
            },
          ],
        );
        return;
      }
      navigation.replace('MainApp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF0FB" />

      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
        <Text style={styles.title}>Welcome to PillSafe</Text>
        <Text style={styles.subtitle}>
          Connect to the dispenser hotspot, then open the live caregiver/patient
          screens. There is no cloud login — the hub owns users and schedules.
        </Text>
      </View>

      <View style={styles.formCard}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => enterApp({requireUser: true})}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Wifi size={18} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>CONNECT TO HUB</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('DeviceConnection')}
          disabled={loading}>
          <Users size={18} color="#3B5BDB" />
          <Text style={styles.secondaryButtonText}>DEVICE CONNECTION</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => navigation.replace('MainApp')}
          disabled={loading}>
          <Text style={styles.demoButtonText}>CONTINUE WITHOUT HUB (UI ONLY)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signupLinkText}>
            New patient? <Text style={styles.signupBold}>Register on hub</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#EEF0FB',
    paddingHorizontal: 20,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  logoContainer: {alignItems: 'center', marginBottom: 28, marginTop: 40},
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
  },
  logoTextPill: {fontSize: 16, fontWeight: 'bold', color: '#FFFFFF'},
  logoTextSafe: {fontSize: 16, fontWeight: 'bold', color: '#A5F3FC'},
  title: {
    fontSize: 26,
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
    paddingHorizontal: 8,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  loginButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#3B5BDB',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  demoButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signupLink: {alignItems: 'center', marginTop: 8},
  signupLinkText: {fontSize: 13, color: '#6B7280'},
  signupBold: {color: '#3B5BDB', fontWeight: '700'},
});

export default LoginScreen;

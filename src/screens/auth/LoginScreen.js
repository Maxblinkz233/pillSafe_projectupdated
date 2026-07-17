import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {User, Phone} from 'lucide-react-native';
import {saveApiConfig} from '../../services/config';

/**
 * App-level sign-in (local session). Hub connection comes next.
 */
const LoginScreen = ({navigation}) => {
  const [fullName, setFullName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const name = fullName.trim();
    const phone = caregiverPhone.trim();
    if (!name) {
      Alert.alert('Missing name', 'Enter your name to sign in.');
      return;
    }
    if (!phone) {
      Alert.alert(
        'Missing phone',
        'Enter a caregiver phone number (e.g. +233…).',
      );
      return;
    }

    setLoading(true);
    try {
      await saveApiConfig({
        userName: name,
        caregiverPhone: phone,
        signedIn: true,
      });
      navigation.replace('DeviceConnection', {afterLogin: true});
    } catch (err) {
      Alert.alert('Sign-in failed', err?.message || String(err));
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
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>
          Start with your details. After sign-in you will connect to the
          PillSafe hub.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputContainer}>
          <User size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>Caregiver Phone</Text>
        <View style={styles.inputContainer}>
          <Phone size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="+233…"
            placeholderTextColor="#9CA3AF"
            value={caregiverPhone}
            onChangeText={setCaregiverPhone}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleSignIn}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>SIGN IN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signupLinkText}>
            New patient?{' '}
            <Text style={styles.signupBold}>Register on hub</Text>
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  inputIcon: {marginRight: 10},
  input: {flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827'},
  loginButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  signupLink: {alignItems: 'center', marginTop: 18},
  signupLinkText: {fontSize: 13, color: '#6B7280'},
  signupBold: {color: '#3B5BDB', fontWeight: '700'},
});

export default LoginScreen;

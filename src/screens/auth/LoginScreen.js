import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { User, Phone, Lock } from 'lucide-react-native';

/**
 * Credentials are collected first, then validated after hub connection.
 */
const LoginScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [claimMode, setClaimMode] = useState(false);

  const handleLogin = () => {
    const name = fullName.trim();
    if (!name) {
      Alert.alert('Missing name', 'Enter the patient name.');
      return;
    }
    if (password.length < 8) {
      Alert.alert(
        'Invalid password',
        'Password must be at least 8 characters.',
      );
      return;
    }
    if (claimMode) {
      if (password !== confirmPassword) {
        Alert.alert('Passwords do not match', 'Re-enter the same password.');
        return;
      }
      if (!caregiverPhone.trim()) {
        Alert.alert(
          'Missing caregiver phone',
          'Enter the phone already stored for this patient.',
        );
        return;
      }
    }

    navigation.navigate('DeviceConnection', {
      authIntent: claimMode ? 'claim' : 'login',
      accountData: {
        fullName: name,
        password,
        caregiverName: caregiverName.trim(),
        caregiverPhone: caregiverPhone.trim(),
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF0FB" />

      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>
          {claimMode
            ? 'Set the first password for a patient already stored on the hub.'
            : 'Enter your patient name and password, then connect to the PillSafe hub.'}
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

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Minimum 8 characters"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {claimMode && (
          <>
            <Text style={styles.label}>Re-enter Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repeat password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <Text style={styles.label}>Caregiver Name (optional)</Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Caregiver full name"
                placeholderTextColor="#9CA3AF"
                value={caregiverName}
                onChangeText={setCaregiverName}
              />
            </View>

            <Text style={styles.label}>Existing Caregiver Phone</Text>
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
          </>
        )}

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>
            {claimMode ? 'SET PASSWORD & CONNECT' : 'LOGIN & CONNECT'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.claimLink}
          onPress={() => setClaimMode(value => !value)}
        >
          <Text style={styles.claimLinkText}>
            {claimMode
              ? 'Back to Login'
              : 'Existing patient without a password? Set one'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signupLinkText}>
            New patient? <Text style={styles.signupBold}>Sign Up</Text>
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
  logoContainer: { alignItems: 'center', marginBottom: 28, marginTop: 40 },
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
  },
  logoTextPill: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  logoTextSafe: { fontSize: 16, fontWeight: 'bold', color: '#A5F3FC' },
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
    shadowOffset: { width: 0, height: 2 },
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
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },
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
  signupLink: { alignItems: 'center', marginTop: 18 },
  claimLink: { alignItems: 'center', marginTop: 16 },
  claimLinkText: { fontSize: 13, color: '#3B5BDB', fontWeight: '600' },
  signupLinkText: { fontSize: 13, color: '#6B7280' },
  signupBold: { color: '#3B5BDB', fontWeight: '700' },
});

export default LoginScreen;

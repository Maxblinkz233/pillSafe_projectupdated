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

const SignUpScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');

  const handleSignUp = () => {
    const name = fullName.trim();
    const phone = caregiverPhone.trim();
    if (!name) {
      Alert.alert('Missing name', 'Enter the patient’s full name.');
      return;
    }
    if (password.length < 8) {
      Alert.alert(
        'Invalid password',
        'Password must be at least 8 characters.',
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter the same password.');
      return;
    }
    if (!caregiverName.trim()) {
      Alert.alert('Missing caregiver name', 'Enter the caregiver’s full name.');
      return;
    }
    if (!phone) {
      Alert.alert(
        'Missing phone',
        'Enter a caregiver phone number for SMS alerts (e.g. +233…).',
      );
      return;
    }
    navigation.navigate('DeviceConnection', {
      authIntent: 'signup',
      accountData: {
        fullName: name,
        password,
        caregiverName: caregiverName.trim(),
        caregiverPhone: phone,
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
        <Text style={styles.title}>Sign Up</Text>
        <Text style={styles.subtitle}>
          Enter your details first. Next, connect to the hub and choose a
          dispenser compartment.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputContainer}>
          <User size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Patient full name"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
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

        <Text style={styles.label}>Caregiver Name</Text>
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

        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>CONTINUE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>
            Already registered? <Text style={styles.loginLinkBold}>Login</Text>
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
    paddingHorizontal: 10,
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
  signUpButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loginLink: { alignItems: 'center', marginTop: 18 },
  loginLinkText: { fontSize: 13, color: '#6B7280' },
  loginLinkBold: { color: '#3B5BDB', fontWeight: '700' },
});

export default SignUpScreen;

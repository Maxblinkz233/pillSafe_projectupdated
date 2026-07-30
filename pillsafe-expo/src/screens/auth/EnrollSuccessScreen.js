import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {CheckCircle} from 'lucide-react-native';
import {saveApiConfig} from '../../services/config';

const EnrollSuccessScreen = ({navigation}) => {
  const goDashboard = async () => {
    await saveApiConfig({signedIn: true});
    navigation.replace('MainApp');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.glowContainer}>
          <View style={styles.glowOuter}>
            <View style={styles.glowMiddle}>
              <View style={styles.successCircle}>
                <CheckCircle size={60} color="#10B981" />
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.title}>Enrollment Successful</Text>
        <Text style={styles.subtitle}>
          Your dispenser profile is ready. You can enrol biometrics later from
          Settings if you skipped them on this device.
        </Text>
      </View>

      <TouchableOpacity style={styles.dashboardButton} onPress={goDashboard}>
        <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 20,
  },
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  logoTextPill: {fontSize: 16, fontWeight: 'bold', color: '#FFFFFF'},
  logoTextSafe: {fontSize: 16, fontWeight: 'bold', color: '#A5F3FC'},
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  glowOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59, 91, 219, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowMiddle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(59, 91, 219, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  dashboardButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EnrollSuccessScreen;

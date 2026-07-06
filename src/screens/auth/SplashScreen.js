import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF0FB" />

      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
        <Text style={styles.tagline}>Smart Medication Management</Text>
      </View>

      <View style={styles.bottomContainer}>
        <ActivityIndicator size="small" color="#3B5BDB" />
        <Text style={styles.syncText}>SYNCHRONIZING SECURELY</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: 100,
  },
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 16,
  },
  logoTextPill: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoTextSafe: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A5F3FC',
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  bottomContainer: {
    alignItems: 'center',
    marginBottom: 60,
    gap: 12,
  },
  syncText: {
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 2,
    fontWeight: '500',
  },
});

export default SplashScreen;
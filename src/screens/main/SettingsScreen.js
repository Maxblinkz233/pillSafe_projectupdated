import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  Bell,
  Lock,
  Smartphone,
  MessageSquare,
  Radio,
  Settings,
  Scan,
  Wifi,
  HelpCircle,
  Phone,
  Info,
  LogOut,
  ChevronRight,
  Trash2,
  Mic,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getApiConfig, signOutLocal } from '../../services/config';
import { api, initials } from '../../services/api';

const SettingsScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('Patient');
  const [faceEnrolled, setFaceEnrolled] = useState(true);
  const [voiceEnrolled, setVoiceEnrolled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const cfg = await getApiConfig();
        if (!active) return;
        setUserName(cfg.userName || 'Patient');
        if (cfg.userId) {
          try {
            const status = await api.getEnrolStatus(cfg.userId);
            if (!active) return;
            setFaceEnrolled(Boolean(status?.face_enrolled));
            setVoiceEnrolled(Boolean(status?.voice_enrolled));
          } catch {
            // Keep the settings stable while the hub is offline.
          }
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleLogout = async () => {
    await signOutLocal();
    navigation.replace('Login');
  };

  const SettingsItem = ({ icon, label, onPress }) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={
        onPress ||
        (() => navigation.navigate('SettingsDetail', { title: label }))
      }
    >
      <View style={styles.settingsIconContainer}>{icon}</View>
      <Text style={styles.settingsLabel}>{label}</Text>
      <ChevronRight size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
          <Bell size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => navigation.navigate('Profile')}
      >
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{initials(userName)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userName}</Text>
          <View style={styles.viewProfileRow}>
            <Text style={styles.viewProfileText}>View Profile</Text>
            <ChevronRight size={14} color="#3B5BDB" />
          </View>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.sectionCard}>
        <SettingsItem
          icon={<Lock size={20} color="#3B5BDB" />}
          label="Privacy"
        />
        <View style={styles.divider} />
        <SettingsItem
          icon={<Smartphone size={20} color="#3B5BDB" />}
          label="Linked Devices"
        />
        <View style={styles.divider} />
        <SettingsItem
          icon={<Trash2 size={20} color="#991B1B" />}
          label="Delete Account"
          onPress={() => navigation.navigate('Profile')}
        />
      </View>

      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.sectionCard}>
        <SettingsItem
          icon={<Bell size={20} color="#3B5BDB" />}
          label="Push Alerts"
        />
        <View style={styles.divider} />
        <SettingsItem
          icon={<MessageSquare size={20} color="#3B5BDB" />}
          label="SMS Notifications"
        />
        <View style={styles.divider} />
        <SettingsItem
          icon={<Radio size={20} color="#3B5BDB" />}
          label="Caregiver Alerts"
        />
      </View>

      <Text style={styles.sectionLabel}>DISPENSER</Text>
      <View style={styles.sectionCard}>
        <SettingsItem
          icon={<Settings size={20} color="#3B5BDB" />}
          label="Device Calibration"
        />
        <View style={styles.divider} />
        {!faceEnrolled && (
          <>
            <View style={styles.divider} />
            <SettingsItem
              icon={<Scan size={20} color="#F59E0B" />}
              label="Complete Face Enrolment"
              onPress={() => navigation.navigate('FaceEnroll')}
            />
          </>
        )}
        {!voiceEnrolled && (
          <>
            <View style={styles.divider} />
            <SettingsItem
              icon={<Mic size={20} color="#F59E0B" />}
              label="Complete Voice Enrolment"
              onPress={() => navigation.navigate('VoiceEnroll')}
            />
          </>
        )}
        <View style={styles.divider} />
        <SettingsItem
          icon={<Wifi size={20} color="#3B5BDB" />}
          label="Device Connection"
          onPress={() => navigation.navigate('DeviceConnection')}
        />
      </View>

      <Text style={styles.sectionLabel}>SUPPORT</Text>
      <View style={styles.sectionCard}>
        <SettingsItem
          icon={<HelpCircle size={20} color="#3B5BDB" />}
          label="Help Center"
        />
        <View style={styles.divider} />
        <SettingsItem
          icon={<Phone size={20} color="#3B5BDB" />}
          label="Contact Us"
        />
        <View style={styles.divider} />
        <SettingsItem
          icon={<Info size={20} color="#3B5BDB" />}
          label="About PillSafe"
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#991B1B" />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 16,
  },
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  logoTextPill: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  logoTextSafe: { fontSize: 16, fontWeight: 'bold', color: '#A5F3FC' },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B5BDB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  viewProfileText: {
    fontSize: 13,
    color: '#3B5BDB',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingsIconContainer: {
    width: 24,
    alignItems: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 54,
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
  },
});

export default SettingsScreen;

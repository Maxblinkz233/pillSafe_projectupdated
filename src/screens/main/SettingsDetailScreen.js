import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  Shield,
  Lock,
  Smartphone,
  Bell,
  MessageSquare,
  Radio,
  Settings,
  Wifi,
  HelpCircle,
  Phone,
  Info,
  CheckCircle,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { getApiConfig, saveApiConfig } from '../../services/config';

const screenContent = {
  Security: {
    icon: <Shield size={24} color="#3B5BDB" />,
    description:
      'Manage your account security settings and authentication methods.',
    toggles: [
      {
        id: 'biometric',
        label: 'Biometric Login',
        subtitle: 'Use face ID to log in',
        default: true,
      },
      {
        id: 'twoFactor',
        label: 'Two-Factor Authentication',
        subtitle: 'Extra layer of security',
        default: false,
      },
      {
        id: 'autoLock',
        label: 'Auto Lock',
        subtitle: 'Lock app after 5 minutes',
        default: true,
      },
    ],
    info: [
      { label: 'Last Login', value: 'Today, 08:32 AM' },
      { label: 'Device', value: 'Android Phone' },
      { label: 'Account Status', value: 'Active' },
    ],
  },
  Privacy: {
    icon: <Lock size={24} color="#3B5BDB" />,
    description: 'Control your data and privacy preferences.',
    toggles: [
      {
        id: 'dataSharing',
        label: 'Data Sharing',
        subtitle: 'Share usage data to improve app',
        default: false,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        subtitle: 'Allow anonymous analytics',
        default: true,
      },
      {
        id: 'crashReports',
        label: 'Crash Reports',
        subtitle: 'Send crash reports automatically',
        default: true,
      },
    ],
    info: [
      { label: 'Data Stored', value: 'Encrypted locally' },
      { label: 'Policy Version', value: 'v2.1 (2026)' },
    ],
  },
  'Linked Devices': {
    icon: <Smartphone size={24} color="#3B5BDB" />,
    description: 'Manage devices linked to your PillSafe account.',
    toggles: [],
    devices: [],
    info: [],
  },
  'Push Alerts': {
    icon: <Bell size={24} color="#3B5BDB" />,
    description: 'Configure push notification preferences.',
    toggles: [
      {
        id: 'missedDose',
        label: 'Missed Dose Alerts',
        subtitle: 'Get notified when a dose is missed',
        default: true,
      },
      {
        id: 'dispensed',
        label: 'Dose Dispensed',
        subtitle: 'Notify when medication is dispensed',
        default: true,
      },
      {
        id: 'reminders',
        label: 'Upcoming Reminders',
        subtitle: '15 min before scheduled dose',
        default: true,
      },
      {
        id: 'deviceAlerts',
        label: 'Device Alerts',
        subtitle: 'Battery low, offline alerts',
        default: true,
      },
    ],
    info: [],
  },
  'SMS Notifications': {
    icon: <MessageSquare size={24} color="#3B5BDB" />,
    description: 'Manage SMS notification settings.',
    toggles: [
      {
        id: 'smsEnabled',
        label: 'SMS Notifications',
        subtitle: 'Enable SMS alerts',
        default: true,
      },
      {
        id: 'smsMissed',
        label: 'Missed Dose SMS',
        subtitle: 'Send SMS when dose is missed',
        default: true,
      },
      {
        id: 'smsCaregiver',
        label: 'Caregiver SMS',
        subtitle: 'Notify caregiver via SMS',
        default: true,
      },
    ],
    info: [{ label: 'Caregiver Number', value: 'Not set' }],
  },
  'Caregiver Alerts': {
    icon: <Radio size={24} color="#3B5BDB" />,
    description: 'Configure alerts sent to your caregiver.',
    toggles: [
      {
        id: 'caregiverMissed',
        label: 'Missed Dose Alert',
        subtitle: 'Alert caregiver on missed dose',
        default: true,
      },
      {
        id: 'caregiverVerify',
        label: 'Verification Failed',
        subtitle: 'Alert when face verification fails',
        default: true,
      },
      {
        id: 'caregiverBattery',
        label: 'Battery Low',
        subtitle: 'Alert when device battery is low',
        default: false,
      },
    ],
    info: [
      { label: 'Caregiver', value: 'Not set' },
      { label: 'Contact', value: 'Not set' },
    ],
  },
  'Device Calibration': {
    icon: <Settings size={24} color="#3B5BDB" />,
    description:
      'Calibrate your PillSafe dispenser for accurate medication delivery.',
    toggles: [
      {
        id: 'autoCalibrate',
        label: 'Auto Calibration',
        subtitle: 'Calibrate automatically on startup',
        default: true,
      },
    ],
    info: [
      { label: 'Last Calibration', value: 'Yesterday, 06:00 AM' },
      { label: 'Carousel Status', value: 'Aligned' },
      { label: 'IR Sensor', value: 'Active' },
      { label: 'Motor Status', value: 'Normal' },
    ],
  },
  'Wi-Fi Setup': {
    icon: <Wifi size={24} color="#3B5BDB" />,
    description: 'Configure Wi-Fi connection for your PillSafe Hub.',
    toggles: [
      {
        id: 'autoConnect',
        label: 'Auto Connect',
        subtitle: 'Automatically connect to saved networks',
        default: true,
      },
    ],
    info: [
      { label: 'Network', value: 'Home Wi-Fi' },
      { label: 'Signal', value: 'Strong (-45 dBm)' },
      { label: 'IP Address', value: '192.168.1.105' },
      { label: 'Status', value: 'Connected' },
    ],
  },
  'Help Center': {
    icon: <HelpCircle size={24} color="#3B5BDB" />,
    description: 'Find answers to common questions about PillSafe.',
    toggles: [],
    faqs: [
      {
        q: 'How does facial verification work?',
        a: 'PillSafe uses the Pi camera to scan your face and match it against your enrolled biometric data.',
      },
      {
        q: 'What if face verification fails?',
        a: 'You can use voice verification as an alternative or contact your caregiver for manual override.',
      },
      {
        q: 'How do I add a new medication?',
        a: 'Go to Schedule tab and tap the + Add Med button to add a new medication.',
      },
      {
        q: 'How do I change my caregiver?',
        a: 'Go to Settings > Caregiver Alerts to update your caregiver contact information.',
      },
    ],
    info: [],
  },
  'Contact Us': {
    icon: <Phone size={24} color="#3B5BDB" />,
    description: 'Get in touch with the PillSafe support team.',
    toggles: [],
    info: [
      { label: 'Email', value: 'support@pillsafe.com' },
      { label: 'Phone', value: '+233 XX XXX XXXX' },
      { label: 'Hours', value: 'Mon-Fri, 8AM - 6PM' },
      { label: 'Response Time', value: 'Within 24 hours' },
    ],
  },
  'About PillSafe': {
    icon: <Info size={24} color="#3B5BDB" />,
    description: 'Information about the PillSafe application.',
    toggles: [],
    info: [
      { label: 'App Version', value: '0.0.1' },
      { label: 'Build', value: '2026.1.0' },
    ],
  },
};

const SettingsDetailScreen = ({ navigation, route }) => {
  const { title } = route.params;
  const content = screenContent[title];
  const [info, setInfo] = useState(content.info || []);
  const [devices, setDevices] = useState(content.devices || []);
  const [userId, setUserId] = useState(null);
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggles, setToggles] = useState(
    content.toggles.reduce((acc, t) => ({ ...acc, [t.id]: t.default }), {}),
  );

  const toggleSwitch = id => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfg = await getApiConfig();
        if (!active) return;
        setUserId(cfg.userId);

        let user = null;
        if (cfg.userId) {
          user = await api.getUser(cfg.userId);
        }
        if (!active) return;

        const name = user?.caregiver_name || cfg.caregiverName || '';
        const phone = user?.caregiver_phone || cfg.caregiverPhone || '';
        setCaregiverName(name);
        setCaregiverPhone(phone);

        if (title === 'SMS Notifications') {
          setInfo([{ label: 'Caregiver Number', value: phone || 'Not set' }]);
        } else if (title === 'Caregiver Alerts') {
          setInfo([
            { label: 'Caregiver', value: name || 'Not set' },
            { label: 'Contact', value: phone || 'Not set' },
          ]);
        } else if (title === 'Linked Devices') {
          const health = await api.health();
          if (!active) return;
          const status = health?.devices || {};
          const rows = [
            ['Raspberry Pi Hub', 'pi_hub', 'Primary controller'],
            ['SIM800C GSM', 'gsm', 'SMS module'],
            ['DS3231 RTC', 'rtc', 'Real-time clock'],
            ['Camera', 'camera', 'Face verification'],
            ['Microphone', 'microphone', 'Voice verification'],
          ].map(([nameValue, key, type]) => ({
            name: nameValue,
            type,
            status: status[key] ? 'Connected' : 'Unavailable',
          }));
          setDevices(rows);
          setInfo([
            {
              label: 'Available Components',
              value: `${health?.connected_device_count || 0} / 5`,
            },
          ]);
        }
      } catch (err) {
        if (active && title === 'Linked Devices') {
          setInfo([{ label: 'Hub Status', value: 'Offline' }]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [title]);

  const saveCaregiver = async () => {
    if (!caregiverName.trim() || !caregiverPhone.trim()) {
      Alert.alert(
        'Missing details',
        'Enter both caregiver name and phone number.',
      );
      return;
    }
    if (!userId) {
      Alert.alert('No patient selected', 'Connect and select a patient first.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateUser(userId, {
        caregiver_name: caregiverName.trim(),
        caregiver_phone: caregiverPhone.trim(),
      });
      await saveApiConfig({
        caregiverName: updated.caregiver_name,
        caregiverPhone: updated.caregiver_phone,
      });
      setInfo([
        { label: 'Caregiver', value: updated.caregiver_name },
        { label: 'Contact', value: updated.caregiver_phone },
      ]);
      Alert.alert('Updated', 'Caregiver contact saved to the hub.');
    } catch (err) {
      Alert.alert('Update failed', err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Title Card */}
      <View style={styles.titleCard}>
        <View style={styles.titleIconContainer}>{content.icon}</View>
        <View style={styles.titleTextContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.descriptionText}>{content.description}</Text>
        </View>
      </View>

      {/* Toggles */}
      {content.toggles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.sectionCard}>
            {content.toggles.map((toggle, index) => (
              <View key={toggle.id}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>{toggle.label}</Text>
                    <Text style={styles.toggleSubtitle}>{toggle.subtitle}</Text>
                  </View>
                  <Switch
                    value={toggles[toggle.id]}
                    onValueChange={() => toggleSwitch(toggle.id)}
                    trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                    thumbColor={toggles[toggle.id] ? '#3B5BDB' : '#9CA3AF'}
                  />
                </View>
                {index < content.toggles.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {title === 'Caregiver Alerts' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CAREGIVER CONTACT</Text>
          <View style={styles.sectionCard}>
            <TextInput
              style={styles.textInput}
              value={caregiverName}
              onChangeText={setCaregiverName}
              placeholder="Caregiver name"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.divider} />
            <TextInput
              style={styles.textInput}
              value={caregiverPhone}
              onChangeText={setCaregiverPhone}
              placeholder="+233…"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveCaregiver}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save caregiver</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Devices */}
      {devices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LINKED DEVICES</Text>
          <View style={styles.sectionCard}>
            {devices.map((device, index) => (
              <View key={index}>
                <View style={styles.deviceRow}>
                  <View style={styles.deviceIcon}>
                    <Smartphone size={20} color="#3B5BDB" />
                  </View>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceType}>{device.type}</Text>
                  </View>
                  <View
                    style={[
                      styles.deviceStatus,
                      device.status === 'Connected' ||
                      device.status === 'This device'
                        ? styles.deviceStatusActive
                        : styles.deviceStatusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.deviceStatusText,
                        device.status === 'Connected' ||
                        device.status === 'This device'
                          ? styles.deviceStatusTextActive
                          : styles.deviceStatusTextInactive,
                      ]}
                    >
                      {device.status}
                    </Text>
                  </View>
                </View>
                {index < devices.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* FAQs */}
      {content.faqs && content.faqs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
          {content.faqs.map((faq, index) => (
            <View key={index} style={styles.faqCard}>
              <View style={styles.faqQuestion}>
                <CheckCircle size={16} color="#3B5BDB" />
                <Text style={styles.faqQuestionText}>{faq.q}</Text>
              </View>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Info */}
      {info.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INFORMATION</Text>
          <View style={styles.sectionCard}>
            {info.map((item, index) => (
              <View key={index}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
                {index < info.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    marginBottom: 20,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  titleCard: {
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
  titleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  deviceType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deviceStatus: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deviceStatusActive: {
    backgroundColor: '#D1FAE5',
  },
  deviceStatusInactive: {
    backgroundColor: '#F3F4F6',
  },
  deviceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deviceStatusTextActive: {
    color: '#065F46',
  },
  deviceStatusTextInactive: {
    color: '#6B7280',
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 10,
    margin: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SettingsDetailScreen;

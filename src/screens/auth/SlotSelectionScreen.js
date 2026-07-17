import React, {useState, useEffect} from 'react';
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
import {CheckCircle} from 'lucide-react-native';
import {api} from '../../services/api';
import {saveApiConfig} from '../../services/config';

const COMPARTMENTS = [
  {id: 'A', index: 0},
  {id: 'B', index: 1},
  {id: 'C', index: 2},
  {id: 'D', index: 3},
  {id: 'E', index: 4},
  {id: 'F', index: 5},
];

const SlotSelectionScreen = ({navigation, route}) => {
  const fullName = route?.params?.fullName || '';
  const caregiverPhone = route?.params?.caregiverPhone || '';
  const [selectedIndex, setSelectedIndex] = useState(2);
  const [saving, setSaving] = useState(false);
  const [occupied, setOccupied] = useState(new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const users = await api.getUsers();
        if (!active) return;
        setOccupied(
          new Set((users || []).map(u => Number(u.compartment_index))),
        );
      } catch {
        // Hub may be offline during UI walkthrough
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleContinue = async () => {
    if (!fullName || !caregiverPhone) {
      Alert.alert(
        'Missing signup details',
        'Go back and enter name and caregiver phone first.',
      );
      return;
    }
    if (occupied.has(selectedIndex)) {
      Alert.alert('Slot in use', 'Choose an available compartment.');
      return;
    }

    setSaving(true);
    try {
      const result = await api.createUser({
        fullName,
        caregiverPhone,
        compartmentIndex: selectedIndex,
      });
      const userId = result?.user_id;
      if (userId == null) {
        throw new Error('Hub did not return a user_id');
      }
      await saveApiConfig({userId, userName: fullName, signedIn: true});
      navigation.navigate('FaceEnroll');
    } catch (err) {
      Alert.alert(
        'Could not create user',
        err?.message ||
          String(err) ||
          'Check Device Connection (hub URL + token) and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(fullName || 'P').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.patientLabel}>Patient</Text>
            <Text style={styles.userName}>{fullName || 'New patient'}</Text>
          </View>
        </View>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
      </View>

      <Text style={styles.title}>Assign Dispenser Compartment</Text>
      <Text style={styles.subtitle}>
        Each patient owns one compartment (0–5) on the hub cylinder.
      </Text>

      <View style={styles.slotsGrid}>
        {COMPARTMENTS.map(slot => {
          const inUse = occupied.has(slot.index);
          const selected = selectedIndex === slot.index;
          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slotCard,
                inUse && styles.slotCardInuse,
                selected && !inUse && styles.slotCardSelected,
              ]}
              onPress={() => {
                if (!inUse) setSelectedIndex(slot.index);
              }}
              disabled={inUse}>
              <Text
                style={[
                  styles.slotLetter,
                  inUse && styles.slotLetterInuse,
                  selected && !inUse && styles.slotLetterSelected,
                ]}>
                {slot.id}
              </Text>
              {selected && !inUse ? (
                <View style={styles.selectedRow}>
                  <CheckCircle size={14} color="#3B5BDB" />
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.slotStatus,
                    inUse ? styles.slotStatusInuse : styles.slotStatusAvailable,
                  ]}>
                  {inUse ? 'In use' : `Compartment ${slot.index}`}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={saving}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, saving && styles.continueDisabled]}
          onPress={handleContinue}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Create & Continue</Text>
          )}
        </TouchableOpacity>
      </View>
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
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
  patientLabel: {fontSize: 11, color: '#6B7280'},
  userName: {fontSize: 15, fontWeight: 'bold', color: '#111827'},
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoTextPill: {fontSize: 14, fontWeight: 'bold', color: '#FFFFFF'},
  logoTextSafe: {fontSize: 14, fontWeight: 'bold', color: '#A5F3FC'},
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  slotCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  slotCardInuse: {backgroundColor: '#F3F4F6', borderColor: '#E5E7EB'},
  slotCardSelected: {borderColor: '#3B5BDB', backgroundColor: '#EEF2FF'},
  slotLetter: {fontSize: 22, fontWeight: 'bold', color: '#111827'},
  slotLetterInuse: {color: '#9CA3AF'},
  slotLetterSelected: {color: '#3B5BDB'},
  selectedRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  selectedText: {fontSize: 11, color: '#3B5BDB', fontWeight: '600'},
  slotStatus: {fontSize: 11, fontWeight: '500'},
  slotStatusAvailable: {color: '#6B7280'},
  slotStatusInuse: {color: '#9CA3AF'},
  buttonRow: {flexDirection: 'row', gap: 12},
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  backButtonText: {fontSize: 14, color: '#3B5BDB', fontWeight: '700'},
  continueButton: {
    flex: 1,
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueDisabled: {opacity: 0.7},
  continueButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: 'bold'},
});

export default SlotSelectionScreen;

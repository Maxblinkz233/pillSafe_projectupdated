import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  Pill,
  Clock,
  Tag,
  Hash,
  CheckCircle,
} from 'lucide-react-native';
import {getApiConfig} from '../../services/config';
import {api, buildTodayDoses, formatTime12h, toDoseTime24h, todayIsoDate} from '../../services/api';

const SLOTS = [
  {label: 'Slot 1', index: 0},
  {label: 'Slot 2', index: 1},
  {label: 'Slot 3', index: 2},
  {label: 'Slot 4', index: 3},
  {label: 'Slot 5', index: 4},
  {label: 'Slot 6', index: 5},
  {label: 'Slot 7', index: 6},
  {label: 'Slot 8', index: 7},
  {label: 'Slot 9', index: 8},
];
const CATEGORIES = [
  'Blood Pressure',
  'Diabetes',
  'Cholesterol',
  'Pain Relief',
  'Antibiotic',
  'Other',
];
const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function initialTimeParts() {
  const now = new Date();
  let hour = now.getHours();
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const minute = Math.round(now.getMinutes() / 5) * 5;
  return {
    hour12: hour,
    minute: minute === 60 ? 0 : minute,
    period,
  };
}

function timePartsFrom24(hhmm) {
  const match = String(hhmm || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return initialTimeParts();
  let hour = Number(match[1]);
  let minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return initialTimeParts();
  minute = Math.round(minute / 5) * 5;
  if (minute === 60) {
    minute = 0;
    hour = (hour + 1) % 24;
  }
  const period = hour >= 12 ? 'PM' : 'AM';
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;
  return {hour12, minute, period};
}

function splitDosage(raw) {
  const text = String(raw || '');
  const sep = ' · ';
  const idx = text.lastIndexOf(sep);
  if (idx === -1) return {dosage: text, category: ''};
  const dosage = text.slice(0, idx).trim();
  const category = text.slice(idx + sep.length).trim();
  if (CATEGORIES.includes(category)) {
    return {dosage, category};
  }
  return {dosage: text, category: ''};
}

const AddMedicationScreen = ({navigation, route}) => {
  const editSchedule = route?.params?.schedule || null;
  const scheduleId = editSchedule?.scheduleId ?? null;
  const isEdit = scheduleId != null;

  const seed = useMemo(() => {
    if (!editSchedule) {
      return {
        name: '',
        ...splitDosage(''),
        ...initialTimeParts(),
        slotIndex: 0,
      };
    }
    const dosageParts = splitDosage(editSchedule.dosage || '');
    return {
      name: editSchedule.name || '',
      ...dosageParts,
      ...timePartsFrom24(editSchedule.time),
      slotIndex: Number(editSchedule.slotIndex ?? 0),
    };
  }, [editSchedule]);

  const [name, setName] = useState(seed.name);
  const [dosage, setDosage] = useState(seed.dosage);
  const [hour12, setHour12] = useState(seed.hour12);
  const [minute, setMinute] = useState(seed.minute);
  const [period, setPeriod] = useState(seed.period);
  const [selectedSlot, setSelectedSlot] = useState(seed.slotIndex);
  const [selectedCategory, setSelectedCategory] = useState(seed.category);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedLabel, setSavedLabel] = useState('');

  const doseTime24 = toDoseTime24h(hour12, minute, period);
  const doseTimeLabel = formatTime12h(doseTime24);
  const canSave = Boolean(name.trim() && dosage.trim() && doseTime24);

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Missing fields', 'Enter name, dosage, and choose a time.');
      return;
    }

    setSaving(true);
    try {
      const cfg = await getApiConfig();
      if (!cfg.userId) {
        throw new Error(
          'Select a patient in Settings → Device Connection before adding medication.',
        );
      }

      if (isEdit) {
        const [schedules, logs] = await Promise.all([
          api.getSchedules(cfg.userId),
          api.getAdherence(cfg.userId, todayIsoDate()),
        ]);
        const today = buildTodayDoses(schedules, logs);
        const current = today.find(d => d.scheduleId === scheduleId);
        if (current?.status === 'taken') {
          Alert.alert(
            'Already dispensed',
            'This dose was already dispensed today and cannot be edited.',
          );
          return;
        }
      }

      const dosageText = selectedCategory
        ? `${dosage.trim()} · ${selectedCategory}`
        : dosage.trim();

      if (isEdit) {
        await api.updateSchedule(scheduleId, {
          medicationName: name.trim(),
          doseTime: doseTime24,
          slotIndex: selectedSlot,
          dosage: dosageText,
          pillsPerDose: 1,
        });
      } else {
        await api.createSchedule({
          userId: cfg.userId,
          medicationName: name.trim(),
          doseTime: doseTime24,
          slotIndex: selectedSlot,
          dosage: dosageText,
          pillsPerDose: 1,
        });
      }

      setSavedLabel(doseTimeLabel);
      setSaved(true);
      setTimeout(() => navigation.goBack(), 1200);
    } catch (err) {
      Alert.alert('Could not save', err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle size={60} color="#10B981" />
        <Text style={styles.successTitle}>
          {isEdit ? 'Medication Updated!' : 'Medication Added!'}
        </Text>
        <Text style={styles.successSub}>
          {name} at {savedLabel} was saved to the hub schedule.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Medication' : 'Add Medication'}
        </Text>
        <View style={{width: 36}} />
      </View>

      <Text style={styles.sectionLabel}>MEDICATION DETAILS</Text>
      <View style={styles.sectionCard}>
        <View style={styles.inputRow}>
          <Pill size={18} color="#6B7280" />
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Medication Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lisinopril"
              placeholderTextColor="#D1D5DB"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.inputRow}>
          <Hash size={18} color="#6B7280" />
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Dosage</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10mg"
              placeholderTextColor="#D1D5DB"
              value={dosage}
              onChangeText={setDosage}
            />
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>DOSE TIME</Text>
      <View style={styles.timeCard}>
        <View style={styles.timeHeader}>
          <Clock size={18} color="#3B5BDB" />
          <Text style={styles.timePreview}>{doseTimeLabel}</Text>
        </View>

        <Text style={styles.timePartLabel}>Hour</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeChipRow}>
          {HOURS_12.map(h => (
            <TouchableOpacity
              key={`h-${h}`}
              style={[styles.timeChip, hour12 === h && styles.timeChipActive]}
              onPress={() => setHour12(h)}>
              <Text
                style={[
                  styles.timeChipText,
                  hour12 === h && styles.timeChipTextActive,
                ]}>
                {h}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.timePartLabel}>Minute</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeChipRow}>
          {MINUTES.map(m => (
            <TouchableOpacity
              key={`m-${m}`}
              style={[styles.timeChip, minute === m && styles.timeChipActive]}
              onPress={() => setMinute(m)}>
              <Text
                style={[
                  styles.timeChipText,
                  minute === m && styles.timeChipTextActive,
                ]}>
                {String(m).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.timePartLabel}>AM / PM</Text>
        <View style={styles.periodRow}>
          {['AM', 'PM'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}>
              <Text
                style={[
                  styles.periodChipText,
                  period === p && styles.periodChipTextActive,
                ]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionLabel}>CATEGORY (OPTIONAL)</Text>
      <View style={styles.chipGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() =>
              setSelectedCategory(prev => (prev === cat ? '' : cat))
            }>
            <Tag
              size={12}
              color={selectedCategory === cat ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat && styles.chipTextActive,
              ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>CYLINDER SLOT (0–8)</Text>
      <View style={styles.slotGrid}>
        {SLOTS.map(slot => (
          <TouchableOpacity
            key={slot.index}
            style={[
              styles.slotCard,
              selectedSlot === slot.index && styles.slotCardActive,
            ]}
            onPress={() => setSelectedSlot(slot.index)}>
            <Text
              style={[
                styles.slotText,
                selectedSlot === slot.index && styles.slotTextActive,
              ]}>
              {slot.index + 1}
            </Text>
            {selectedSlot === slot.index && (
              <CheckCircle size={14} color="#3B5BDB" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave || saving}>
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Save Changes' : 'Save to Hub'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F3F4F6', paddingHorizontal: 16},
  successContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  successTitle: {fontSize: 24, fontWeight: 'bold', color: '#111827'},
  successSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {fontSize: 17, fontWeight: 'bold', color: '#111827'},
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
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  inputWrapper: {flex: 1},
  inputLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {fontSize: 15, color: '#111827', fontWeight: '500', padding: 0},
  divider: {height: 1, backgroundColor: '#F3F4F6', marginLeft: 46},
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  timePreview: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  timePartLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  timeChipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  timeChip: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  timeChipActive: {backgroundColor: '#3B5BDB'},
  timeChipText: {fontSize: 15, fontWeight: '600', color: '#374151'},
  timeChipTextActive: {color: '#FFFFFF'},
  periodRow: {flexDirection: 'row', gap: 10},
  periodChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  periodChipActive: {backgroundColor: '#3B5BDB'},
  periodChipText: {fontSize: 16, fontWeight: '700', color: '#374151'},
  periodChipTextActive: {color: '#FFFFFF'},
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {backgroundColor: '#3B5BDB', borderColor: '#3B5BDB'},
  chipText: {fontSize: 13, color: '#6B7280', fontWeight: '500'},
  chipTextActive: {color: '#FFFFFF'},
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  slotCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  slotCardActive: {borderColor: '#3B5BDB', backgroundColor: '#EEF2FF'},
  slotText: {fontSize: 18, fontWeight: 'bold', color: '#111827'},
  slotTextActive: {color: '#3B5BDB'},
  saveButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonDisabled: {backgroundColor: '#9CA3AF'},
  saveButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
});

export default AddMedicationScreen;

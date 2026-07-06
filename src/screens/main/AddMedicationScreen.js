import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
} from 'react-native';
import {
  ChevronLeft,
  Pill,
  Clock,
  Tag,
  Hash,
  CheckCircle,
} from 'lucide-react-native';

const slots = ['Slot A', 'Slot B', 'Slot C', 'Slot D', 'Slot E', 'Slot F'];
const periods = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const categories = ['Blood Pressure', 'Diabetes', 'Cholesterol', 'Pain Relief', 'Antibiotic', 'Other'];

const AddMedicationScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!name || !dosage || !selectedSlot || !selectedPeriod) return;
    setSaved(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1500);
  };

  if (saved) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle size={60} color="#10B981" />
        <Text style={styles.successTitle}>Medication Added!</Text>
        <Text style={styles.successSub}>
          {name} {dosage} has been added to your schedule.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Medication</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Medication Name */}
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
        <View style={styles.divider} />
        <View style={styles.inputRow}>
          <Clock size={18} color="#6B7280" />
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Time</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 08:00"
              placeholderTextColor="#D1D5DB"
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>
      </View>

      {/* Category */}
      <Text style={styles.sectionLabel}>CATEGORY</Text>
      <View style={styles.chipGrid}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.chip,
              selectedCategory === cat && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(cat)}>
            <Tag size={12} color={selectedCategory === cat ? '#FFFFFF' : '#6B7280'} />
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

      {/* Period */}
      <Text style={styles.sectionLabel}>TIME PERIOD</Text>
      <View style={styles.chipGrid}>
        {periods.map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.chip,
              selectedPeriod === period && styles.chipActive,
            ]}
            onPress={() => setSelectedPeriod(period)}>
            <Text
              style={[
                styles.chipText,
                selectedPeriod === period && styles.chipTextActive,
              ]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Slot Selection */}
      <Text style={styles.sectionLabel}>DISPENSER SLOT</Text>
      <View style={styles.slotGrid}>
        {slots.map(slot => (
          <TouchableOpacity
            key={slot}
            style={[
              styles.slotCard,
              selectedSlot === slot && styles.slotCardActive,
            ]}
            onPress={() => setSelectedSlot(slot)}>
            <Text
              style={[
                styles.slotText,
                selectedSlot === slot && styles.slotTextActive,
              ]}>
              {slot.replace('Slot ', '')}
            </Text>
            {selectedSlot === slot && (
              <CheckCircle size={14} color="#3B5BDB" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          (!name || !dosage || !selectedSlot || !selectedPeriod) &&
            styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!name || !dosage || !selectedSlot || !selectedPeriod}>
        <CheckCircle size={20} color="#FFFFFF" />
        <Text style={styles.saveButtonText}>Save Medication</Text>
      </TouchableOpacity>

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
  successContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 46,
  },
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
  chipActive: {
    backgroundColor: '#3B5BDB',
    borderColor: '#3B5BDB',
  },
  chipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
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
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  slotCardActive: {
    borderColor: '#3B5BDB',
    backgroundColor: '#EEF2FF',
  },
  slotText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  slotTextActive: {
    color: '#3B5BDB',
  },
  saveButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddMedicationScreen;
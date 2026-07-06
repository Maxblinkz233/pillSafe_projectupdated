import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { slots } from '../../data/mockData';

const SlotSelectionScreen = ({ navigation }) => {
  const [selectedSlot, setSelectedSlot] = useState('C');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View>
            <Text style={styles.patientLabel}>Patient</Text>
            <Text style={styles.userName}>Maxwell</Text>
          </View>
        </View>
        <View style={styles.logoBadge}>
          <Text style={styles.logoTextPill}>Pill</Text>
          <Text style={styles.logoTextSafe}>Safe</Text>
        </View>
      </View>

      {/* Progress Steps */}
      <View style={styles.progressRow}>
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepDone]}>
            <CheckCircle size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>Personal</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <View style={styles.stepActiveDot} />
          </View>
          <Text style={[styles.stepLabel, { color: '#3B5BDB' }]}>Slot</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={styles.progressStep}>
          <View style={styles.stepCircle}>
            <View style={styles.stepInactiveDot} />
          </View>
          <Text style={styles.stepLabel}>Face</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Assign Dispenser Slot</Text>
      <Text style={styles.subtitle}>
        Choose an available slot for the patient's primary medication cycle.
      </Text>

      {/* Slots Grid */}
      <View style={styles.slotsGrid}>
        {slots.map(slot => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.slotCard,
              slot.status === 'inuse' && styles.slotCardInuse,
              selectedSlot === slot.id && styles.slotCardSelected,
            ]}
            onPress={() => {
              if (slot.status !== 'inuse') setSelectedSlot(slot.id);
            }}
            disabled={slot.status === 'inuse'}>
            <Text
              style={[
                styles.slotLetter,
                slot.status === 'inuse' && styles.slotLetterInuse,
                selectedSlot === slot.id && styles.slotLetterSelected,
              ]}>
              {slot.id}
            </Text>
            {selectedSlot === slot.id ? (
              <View style={styles.selectedRow}>
                <CheckCircle size={14} color="#3B5BDB" />
                <Text style={styles.selectedText}>Selected</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.slotStatus,
                  slot.status === 'inuse'
                    ? styles.slotStatusInuse
                    : styles.slotStatusAvailable,
                ]}>
                {slot.status === 'inuse' ? 'In use' : 'Available'}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendDotGray} />
          <Text style={styles.legendText}>Occupied</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDotBlue} />
          <Text style={styles.legendText}>Current Selection</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('FaceEnroll')}>
          <Text style={styles.continueButtonText}>Continue</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B5BDB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoBadge: {
    flexDirection: 'row',
    backgroundColor: '#3B5BDB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoTextPill: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoTextSafe: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#A5F3FC',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 4,
  },
  progressStep: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepActive: {
    borderColor: '#3B5BDB',
    backgroundColor: '#3B5BDB',
  },
  stepActiveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  stepInactiveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
  },
  stepLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#3B5BDB',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  slotCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  slotCardInuse: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  slotCardSelected: {
    borderColor: '#3B5BDB',
    backgroundColor: '#EEF2FF',
  },
  slotLetter: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  slotLetterInuse: {
    color: '#D1D5DB',
  },
  slotLetterSelected: {
    color: '#3B5BDB',
  },
  slotStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  slotStatusAvailable: {
    color: '#10B981',
  },
  slotStatusInuse: {
    color: '#9CA3AF',
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedText: {
    fontSize: 12,
    color: '#3B5BDB',
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDotGray: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
  },
  legendDotBlue: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B5BDB',
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#3B5BDB',
  },
  continueButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default SlotSelectionScreen;
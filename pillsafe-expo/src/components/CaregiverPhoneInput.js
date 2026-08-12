import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import {ChevronDown} from 'lucide-react-native';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  digitsOnly,
  formatE164,
} from '../utils/phoneCountries';

/**
 * Country selector + national number field.
 * Emits E.164 via onChangeE164 whenever country or digits change.
 */
export default function CaregiverPhoneInput({
  country = DEFAULT_PHONE_COUNTRY,
  national = '',
  onChangeCountry,
  onChangeNational,
  onChangeE164,
  placeholder,
  error,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const maxLen = country?.nationalLength || 9;
  const hint = useMemo(
    () =>
      `${country?.flag || ''} +${country?.dial} · exactly ${maxLen} digits`,
    [country, maxLen],
  );

  const setNational = text => {
    const next = digitsOnly(text).slice(0, maxLen);
    onChangeNational?.(next);
    onChangeE164?.(formatE164(country, next));
  };

  const selectCountry = next => {
    onChangeCountry?.(next);
    const clipped = digitsOnly(national).slice(0, next.nationalLength);
    onChangeNational?.(clipped);
    onChangeE164?.(formatE164(next, clipped));
    setPickerOpen(false);
  };

  return (
    <View>
      <View style={[styles.row, error ? styles.rowError : null]}>
        <TouchableOpacity
          style={styles.countryBtn}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Select country code">
          <Text style={styles.flag}>{country?.flag || '🌐'}</Text>
          <Text style={styles.dial}>+{country?.dial}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={national}
          onChangeText={setNational}
          keyboardType="number-pad"
          maxLength={maxLen}
          placeholder={placeholder || `${maxLen} digits`}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      <Text style={styles.hint}>{hint}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select country</Text>
            <FlatList
              data={PHONE_COUNTRIES}
              keyExtractor={item => `${item.code}-${item.dial}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.countryRow,
                    item.code === country?.code && styles.countryRowActive,
                  ]}
                  onPress={() => selectCountry(item)}>
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <View style={{flex: 1}}>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.countryMeta}>
                      +{item.dial} · {item.nationalLength} digits
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  rowError: {
    borderColor: '#F87171',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  flag: {fontSize: 16},
  dial: {fontSize: 14, fontWeight: '700', color: '#111827', marginRight: 2},
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#B91C1C',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  countryRowActive: {
    backgroundColor: '#EEF2FF',
  },
  countryFlag: {fontSize: 22},
  countryName: {fontSize: 15, fontWeight: '600', color: '#111827'},
  countryMeta: {fontSize: 12, color: '#6B7280', marginTop: 2},
});

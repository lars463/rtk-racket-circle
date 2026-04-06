import { useState } from 'react';
import { StyleSheet, View, Platform, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/theme';

interface DateTimeInputProps {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  type: 'date' | 'time';
  placeholder?: string;
  style?: object;
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr + 'T12:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseTime(timeStr: string): Date {
  const d = new Date();
  if (!timeStr) return d;
  const [h, m] = timeStr.split(':').map(Number);
  if (!isNaN(h)) d.setHours(h);
  if (!isNaN(m)) d.setMinutes(m);
  return d;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeStr(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr;
}

// Generate hours 00-23
const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
// Generate minutes 00-55 in 5-min increments
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const selectStyle: React.CSSProperties = {
  flex: 1,
  height: 44,
  fontSize: 16,
  fontFamily: 'inherit',
  color: '#1C1B1F',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  textAlign: 'center',
  paddingLeft: 8,
  paddingRight: 8,
};

function WebTimePicker({ value, onChangeValue }: { value: string; onChangeValue: (v: string) => void }) {
  const [h, m] = value ? value.split(':') : ['', ''];

  const handleHourChange = (newH: string) => {
    const newMin = m || '00';
    onChangeValue(`${newH}:${newMin}`);
  };

  const handleMinuteChange = (newM: string) => {
    const newHour = h || '00';
    onChangeValue(`${newHour}:${newM}`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0 }}>
      <select
        value={h || ''}
        onChange={(e: any) => handleHourChange(e.target.value)}
        style={selectStyle as any}
      >
        <option value="" disabled>TT</option>
        {hours.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <span style={{ fontSize: 18, fontWeight: '600', color: '#1C1B1F', userSelect: 'none' }}>:</span>
      <select
        value={m || ''}
        onChange={(e: any) => handleMinuteChange(e.target.value)}
        style={selectStyle as any}
      >
        <option value="" disabled>MM</option>
        {minutes.map((min) => (
          <option key={min} value={min}>{min}</option>
        ))}
      </select>
    </div>
  );
}

export function DateTimeInput({
  label,
  value,
  onChangeValue,
  type,
  placeholder,
  style,
}: DateTimeInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Web: use native date input for dates, custom 24h select for time
  if (Platform.OS === 'web') {
    if (type === 'time') {
      return (
        <View style={[styles.container, style]}>
          <Text variant="bodySmall" style={styles.label}>{label}</Text>
          <View style={styles.inputWrapper}>
            <WebTimePicker value={value} onChangeValue={onChangeValue} />
          </View>
        </View>
      );
    }

    // Date: use native HTML5 date input (calendar popup)
    return (
      <View style={[styles.container, style]}>
        <Text variant="bodySmall" style={styles.label}>{label}</Text>
        <View style={styles.inputWrapper}>
          <input
            type="date"
            value={value}
            onChange={(e: any) => onChangeValue(e.target.value)}
            placeholder={placeholder}
            style={{
              width: '100%',
              height: 44,
              fontSize: 16,
              fontFamily: 'inherit',
              color: '#1C1B1F',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '0 4px',
              boxSizing: 'border-box' as any,
              cursor: 'pointer',
            }}
          />
        </View>
      </View>
    );
  }

  // Native: use @react-native-community/datetimepicker
  const currentValue = type === 'date' ? parseDate(value) : parseTime(value);
  const displayValue = type === 'date' ? formatDisplayDate(value) : formatDisplayTime(value);
  const iconName = type === 'date' ? 'calendar' : 'clock-outline';

  const handleChange = (_event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios'); // iOS keeps picker open, Android closes
    if (selectedDate) {
      const formatted = type === 'date' ? formatDateStr(selectedDate) : formatTimeStr(selectedDate);
      onChangeValue(formatted);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text variant="bodySmall" style={styles.label}>{label}</Text>
      <Pressable style={styles.inputWrapper} onPress={() => setShowPicker(true)}>
        <View style={styles.nativeRow}>
          <Text
            variant="bodyLarge"
            style={[styles.displayText, !value && styles.placeholderText]}>
            {displayValue || placeholder || (type === 'date' ? 'Vælg dato' : 'Vælg tid')}
          </Text>
          <Icon source={iconName} size={22} color={colors.onSurfaceVariant} />
        </View>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={currentValue}
          mode={type}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          is24Hour={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    fontSize: 12,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#79747E',
    borderRadius: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  nativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  displayText: {
    color: '#1C1B1F',
  },
  placeholderText: {
    color: '#79747E',
  },
});

import { useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable } from 'react-native';
import { TextInput, Button, SegmentedButtons, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useMatches } from '@/contexts/MatchesContext';
import { useAuth } from '@/contexts/AuthContext';
import { DateTimeInput } from '@/components/ui/DateTimeInput';
import { SportType, MatchFormat } from '@/types';
import { colors } from '@/theme';

const tennisLevels = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const padelLevels = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function CreateMatchScreen() {
  const { createMatch } = useMatches();
  const { currentUser } = useAuth();
  const [sport, setSport] = useState<SportType>('tennis');
  const [format, setFormat] = useState<MatchFormat>('doubles');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [levelMin, setLevelMin] = useState<number>(2);
  const [levelMax, setLevelMax] = useState<number>(4);
  const [description, setDescription] = useState('');

  const levels = sport === 'tennis' ? tennisLevels : padelLevels;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = date.trim() && startTime.trim() && location.trim() && levelMin <= levelMax;

  const handleCreate = async () => {
    if (!canSubmit || !currentUser || saving) return;
    setSaving(true);
    try {
      setError('');
      await createMatch({
      sport,
      format,
      status: 'open',
      description: description.trim(),
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim() || startTime.trim(),
      location: location.trim(),
      levelMin,
      levelMax,
      maxPlayers: (format === 'singles' || format === 'singles_mix') ? 2 : 4,
      playerIds: [currentUser.id],
      creatorId: currentUser.id,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Kunne ikke oprette kampen');
    } finally {
      setSaving(false);
    }
  };

  // Reset levels and format when switching sport
  const handleSportChange = (val: string) => {
    setSport(val as SportType);
    if (val === 'tennis') {
      setLevelMin(2);
      setLevelMax(4);
    } else {
      // Padel has no singles — default to doubles
      if (format === 'singles' || format === 'singles_mix') setFormat('doubles');
      setLevelMin(2);
      setLevelMax(3);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="labelLarge" style={styles.label}>Sport</Text>
      <SegmentedButtons
        value={sport}
        onValueChange={handleSportChange}
        buttons={[
          { value: 'tennis', label: 'Tennis', icon: 'tennis-ball' },
          { value: 'padel', label: 'Padel', icon: 'racquetball' },
        ]}
        style={styles.segment}
      />

      <Text variant="labelLarge" style={styles.label}>Format</Text>
      <SegmentedButtons
        value={format}
        onValueChange={(val) => setFormat(val as MatchFormat)}
        buttons={
          sport === 'padel'
            ? [
                { value: 'doubles', label: 'Double (4)' },
                { value: 'mixed', label: 'Mixdouble (4)' },
              ]
            : [
                { value: 'singles', label: 'Single (2)' },
                { value: 'singles_mix', label: 'Single mix (2)' },
                { value: 'doubles', label: 'Double (4)' },
                { value: 'mixed', label: 'Mixdouble (4)' },
              ]
        }
        style={styles.segment}
      />

      <DateTimeInput
        label="Dato *"
        value={date}
        onChangeValue={setDate}
        type="date"
      />
      <View style={styles.row}>
        <DateTimeInput
          label="Starttid *"
          value={startTime}
          onChangeValue={setStartTime}
          type="time"
          style={styles.half}
        />
        <DateTimeInput
          label="Sluttid"
          value={endTime}
          onChangeValue={setEndTime}
          type="time"
          style={styles.half}
        />
      </View>
      <TextInput
        label="Sted *"
        value={location}
        onChangeText={setLocation}
        mode="outlined"
        placeholder={sport === 'tennis' ? 'Bane 1-2' : 'Padel Bane A'}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>
        Min. niveau
      </Text>
      <View style={styles.levelGrid}>
        {levels.map((lvl) => {
          const selected = levelMin === lvl;
          return (
            <Pressable
              key={lvl}
              style={[styles.levelChip, selected && styles.levelChipSelected]}
              onPress={() => {
                setLevelMin(lvl);
                if (lvl > levelMax) setLevelMax(lvl);
              }}>
              <Text
                variant="bodyMedium"
                style={[styles.levelChipText, selected && styles.levelChipTextSelected]}>
                {lvl}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="labelLarge" style={styles.label}>
        Maks. niveau
      </Text>
      <View style={styles.levelGrid}>
        {levels.map((lvl) => {
          const selected = levelMax === lvl;
          const disabled = lvl < levelMin;
          return (
            <Pressable
              key={lvl}
              style={[
                styles.levelChip,
                selected && styles.levelChipSelected,
                disabled && styles.levelChipDisabled,
              ]}
              onPress={() => !disabled && setLevelMax(lvl)}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.levelChipText,
                  selected && styles.levelChipTextSelected,
                  disabled && styles.levelChipTextDisabled,
                ]}>
                {lvl}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        label="Beskrivelse"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        placeholder="Kort beskrivelse af kampen..."
        style={styles.input}
      />

      {error ? <Text style={{ color: '#D32F2F', marginBottom: 8 }}>{error}</Text> : null}

      <Button
        mode="contained"
        onPress={handleCreate}
        disabled={!canSubmit || saving}
        loading={saving}
        style={styles.submitBtn}
        contentStyle={styles.submitContent}>
        Opret kamp
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  label: {
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  segment: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  levelChip: {
    minWidth: 48,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  levelChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  levelChipDisabled: {
    opacity: 0.35,
  },
  levelChipText: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  levelChipTextSelected: {
    color: colors.primary,
  },
  levelChipTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  submitBtn: {
    marginTop: 10,
    borderRadius: 12,
  },
  submitContent: {
    paddingVertical: 6,
  },
});

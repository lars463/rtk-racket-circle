import { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { TextInput, Button, SegmentedButtons, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useAuth } from '@/contexts/AuthContext';
import { DateTimeInput } from '@/components/ui/DateTimeInput';
import { EventCategory } from '@/types';
import { colors } from '@/theme';

const categories: { value: EventCategory; label: string }[] = [
  { value: 'networking', label: 'Netværk' },
  { value: 'tournament', label: 'Turnering' },
  { value: 'social', label: 'Socialt' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'mixer', label: 'Mixer' },
  { value: 'charity', label: 'Velgørenhed' },
];

export default function CreateEventScreen() {
  const { createEvent } = useEvents();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<EventCategory>('networking');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = title.trim() && date.trim() && startTime.trim() && location.trim();

  const handleCreate = async () => {
    if (!canSubmit || !currentUser || saving) return;
    setError('');

    // Validate end time > start time
    if (endTime.trim() && endTime.trim() <= startTime.trim()) {
      setError('Sluttid skal være efter starttid');
      return;
    }

    // Validate deadline is before event date
    if (deadlineDate.trim() && deadlineDate.trim() > date.trim()) {
      setError('Tilmeldingsfrist skal være før begivenhedsdatoen');
      return;
    }

    setSaving(true);
    try {
      const registrationDeadline = deadlineDate.trim()
        ? new Date(`${deadlineDate.trim()}T${deadlineTime.trim() || '23:59'}:00`).toISOString()
        : null;

      await createEvent({
      title: title.trim(),
      description: description.trim(),
      category,
      status: 'upcoming',
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim() || startTime.trim(),
      endDateISO: null,
      registrationDeadline,
      location: location.trim(),
      address: address.trim() || null,
      organizerId: currentUser.id,
      maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
      attendeeIds: [currentUser.id],
      imageUrl: null,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Ukendt fejl ved oprettelse');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        label="Titel *"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Beskrivelse"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Kategori</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <SegmentedButtons
          value={category}
          onValueChange={(val) => setCategory(val as EventCategory)}
          buttons={categories}
        />
      </ScrollView>

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
        placeholder="Klubhuset"
        style={styles.input}
      />
      <TextInput
        label="Fuld adresse (valgfrit)"
        value={address}
        onChangeText={setAddress}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Maks deltagere (valgfrit)"
        value={maxAttendees}
        onChangeText={setMaxAttendees}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Tilmeldingsfrist</Text>
      <View style={styles.row}>
        <DateTimeInput
          label="Frist dato"
          value={deadlineDate}
          onChangeValue={setDeadlineDate}
          type="date"
          style={styles.half}
        />
        <DateTimeInput
          label="Frist tid"
          value={deadlineTime}
          onChangeValue={setDeadlineTime}
          type="time"
          style={styles.half}
        />
      </View>

      {error ? (
        <Text variant="bodySmall" style={styles.error}>{error}</Text>
      ) : null}

      <Button
        mode="contained"
        onPress={handleCreate}
        disabled={!canSubmit || saving}
        loading={saving}
        style={styles.submitBtn}
        contentStyle={styles.submitContent}>
        Opret begivenhed
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
  categoryScroll: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  submitBtn: {
    marginTop: 10,
    borderRadius: 12,
  },
  submitContent: {
    paddingVertical: 6,
  },
});

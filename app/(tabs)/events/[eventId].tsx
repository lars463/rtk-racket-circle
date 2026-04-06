import { StyleSheet, ScrollView, View, Alert, Platform } from 'react-native';
import { Text, Button, Card, Icon } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useMembers } from '@/contexts/MembersContext';
import { useAuth } from '@/contexts/AuthContext';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { formatDate, formatTime, getFullName } from '@/utils/formatters';
import { eventCategoryLabels } from '@/data/categories';
import { colors } from '@/theme';

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { getEventById, toggleAttendance, deleteEvent } = useEvents();
  const { getMemberById } = useMembers();
  const { currentUser } = useAuth();
  const event = getEventById(eventId);

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text>Begivenhed ikke fundet</Text>
      </View>
    );
  }

  const organizer = getMemberById(event.organizerId);
  const isAttending = currentUser ? event.attendeeIds.includes(currentUser.id) : false;
  const isFull = event.maxAttendees ? event.attendeeIds.length >= event.maxAttendees : false;
  const isPast = event.status === 'completed';
  const isDeadlinePassed = event.registrationDeadline ? new Date(event.registrationDeadline) < new Date() : false;
  const isAdmin = currentUser?.isAdmin === true;

  const handleToggle = () => {
    if (currentUser) {
      toggleAttendance(event.id, currentUser.id);
    }
  };

  const handleDeleteEvent = () => {
    const doDelete = () => {
      deleteEvent(event.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (confirm('Er du sikker på at du vil slette denne begivenhed?')) {
        doDelete();
      }
    } else {
      Alert.alert('Slet begivenhed', 'Er du sikker på at du vil slette denne begivenhed?', [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Slet', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="labelLarge" style={styles.category}>
          {eventCategoryLabels[event.category]}
        </Text>
        <Text variant="headlineMedium" style={styles.title}>
          {event.title}
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <DetailRow icon="calendar" label={formatDate(event.date)} />
          <DetailRow icon="clock-outline" label={`${formatTime(event.startTime)} - ${formatTime(event.endTime)}`} />
          <DetailRow icon="map-marker-outline" label={event.location} />
          {event.address && <DetailRow icon="directions" label={event.address} />}
          {event.registrationDeadline && (
            <DetailRow
              icon="calendar-clock"
              label={`Tilmeldingsfrist: ${formatDate(event.registrationDeadline)}${new Date(event.registrationDeadline).toTimeString().slice(0, 5) !== '00:00' ? ` kl. ${new Date(event.registrationDeadline).toTimeString().slice(0, 5)}` : ''}`}
            />
          )}
          <DetailRow
            icon="account-group-outline"
            label={`${event.attendeeIds.length}${event.maxAttendees ? ` / ${event.maxAttendees}` : ''} ${event.attendeeIds.length === 1 ? 'deltager' : 'deltagere'}`}
          />
        </Card.Content>
      </Card>

      {!isPast && (
        <View style={styles.rsvpContainer}>
          {isDeadlinePassed ? (
            <Button
              mode="outlined"
              icon={isAttending ? 'check' : 'calendar-clock'}
              disabled
              style={styles.rsvpBtn}>
              {isAttending ? 'Tilmeldt – frist udløbet' : 'Tilmeldingsfrist udløbet'}
            </Button>
          ) : (
            <Button
              mode={isAttending ? 'outlined' : 'contained'}
              icon={isAttending ? 'check' : 'account-plus'}
              onPress={handleToggle}
              disabled={!isAttending && isFull}
              style={styles.rsvpBtn}>
              {isAttending ? 'Tilmeldt' : isFull ? 'Fuldt booket' : 'Tilmeld'}
            </Button>
          )}
        </View>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Om denne begivenhed</Text>
          <Text variant="bodyMedium" style={styles.description}>{event.description}</Text>
        </Card.Content>
      </Card>

      {organizer && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Arrangeret af</Text>
            <View style={styles.organizerRow}>
              <MemberAvatar
                firstName={organizer.firstName}
                lastName={organizer.lastName}
                avatarUrl={organizer.avatarUrl}
                size={44}
              />
              <View>
                <Text variant="titleSmall">
                  {getFullName(organizer.firstName, organizer.lastName)}
                </Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  {organizer.jobTitle}{organizer.companyName ? ` hos ${organizer.companyName}` : ''}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Deltagere ({event.attendeeIds.length})
          </Text>
          {event.attendeeIds.map((id) => {
            const member = getMemberById(id);
            if (!member) return null;
            return (
              <View key={id} style={styles.attendeeRow}>
                <MemberAvatar
                  firstName={member.firstName}
                  lastName={member.lastName}
                  avatarUrl={member.avatarUrl}
                  size={36}
                />
                <Text variant="bodyMedium">
                  {getFullName(member.firstName, member.lastName)}
                </Text>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {isAdmin && (
        <View style={styles.adminSection}>
          <Button
            mode="outlined"
            icon="delete"
            textColor="#D32F2F"
            style={styles.deleteBtn}
            onPress={handleDeleteEvent}>
            Slet begivenhed
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={detailStyles.row}>
      <Icon source={icon} size={20} color={colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={detailStyles.text}>{label}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  text: { color: colors.onSurface, flex: 1 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 30,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  category: {
    color: colors.secondary,
    marginBottom: 6,
  },
  title: {
    fontWeight: '700',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 10,
  },
  description: {
    lineHeight: 22,
    color: colors.onSurface,
  },
  rsvpContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  rsvpBtn: {
    borderRadius: 12,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  adminSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  deleteBtn: {
    borderColor: '#D32F2F',
    borderRadius: 12,
  },
});

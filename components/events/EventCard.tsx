import { StyleSheet, View } from 'react-native';
import { Card, Text, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { ClubEvent } from '@/types';
import { formatDate, formatTime } from '@/utils/formatters';
import { eventCategoryLabels } from '@/data/categories';
import { colors } from '@/theme';

interface EventCardProps {
  event: ClubEvent;
}

export function EventCard({ event }: EventCardProps) {
  const isPast = event.status === 'completed';

  return (
    <Card
      style={[styles.card, isPast && styles.pastCard]}
      onPress={() => router.push(`/events/${event.id}`)}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.dateBadge}>
            <Text variant="titleLarge" style={styles.dateDay}>
              {new Date(event.date).getDate()}
            </Text>
            <Text variant="labelSmall" style={styles.dateMonth}>
              {new Date(event.date).toLocaleString('da', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.info}>
            <Text variant="titleMedium" numberOfLines={2}>
              {event.title}
            </Text>
            <Text variant="labelMedium" style={styles.category}>
              {eventCategoryLabels[event.category]}
            </Text>
          </View>
        </View>
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Icon source="clock-outline" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon source="map-marker-outline" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon source="account-group-outline" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {event.attendeeIds.length}
              {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} {event.attendeeIds.length === 1 ? 'deltager' : 'deltagere'}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  pastCard: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  dateBadge: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 26,
  },
  dateMonth: {
    color: colors.primary,
    fontSize: 10,
  },
  info: {
    flex: 1,
  },
  category: {
    color: colors.secondary,
    marginTop: 2,
  },
  details: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: colors.onSurfaceVariant,
  },
});

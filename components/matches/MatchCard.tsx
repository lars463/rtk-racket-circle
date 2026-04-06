import { StyleSheet, View } from 'react-native';
import { Card, Text, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { Match } from '@/types';
import { formatTime } from '@/utils/formatters';
import { sportTypeLabels, matchFormatLabels } from '@/data/categories';
import { colors } from '@/theme';

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const isPast = match.status === 'completed';
  const isTennis = match.sport === 'tennis';

  return (
    <Card
      style={[styles.card, isPast && styles.pastCard]}
      onPress={() => router.push(`/events/match/${match.id}`)}>
      <Card.Content>
        <View style={styles.header}>
          <View style={[styles.dateBadge, !isTennis && styles.dateBadgePadel]}>
            <Text variant="titleLarge" style={[styles.dateDay, !isTennis && styles.dateDayPadel]}>
              {new Date(match.date).getDate()}
            </Text>
            <Text variant="labelSmall" style={[styles.dateMonth, !isTennis && styles.dateMonthPadel]}>
              {new Date(match.date).toLocaleString('da', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.info}>
            <Text variant="titleMedium" numberOfLines={1}>
              {sportTypeLabels[match.sport]} {matchFormatLabels[match.format]}
            </Text>
            <View style={styles.badges}>
              <View style={[styles.levelBadge, !isTennis && styles.levelBadgePadel]}>
                <Text variant="labelSmall" style={[styles.levelText, !isTennis && styles.levelTextPadel]}>
                  Niveau {match.levelMin}–{match.levelMax}
                </Text>
              </View>
              {match.status === 'full' && (
                <View style={styles.fullBadge}>
                  <Text variant="labelSmall" style={styles.fullText}>Fuld</Text>
                </View>
              )}
              {match.status === 'open' && (
                <View style={styles.openBadge}>
                  <Text variant="labelSmall" style={styles.openText}>Åben</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Icon source="clock-outline" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {formatTime(match.startTime)} - {formatTime(match.endTime)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon source="map-marker-outline" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
              {match.location}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon source="account-group-outline" size={16} color={colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {match.playerIds.length} / {match.maxPlayers} spillere
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
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgePadel: {
    backgroundColor: colors.secondary + '20',
  },
  dateDay: {
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 26,
  },
  dateDayPadel: {
    color: colors.secondary,
  },
  dateMonth: {
    color: colors.primary,
    fontSize: 10,
  },
  dateMonthPadel: {
    color: colors.secondary,
  },
  info: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  levelBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgePadel: {
    backgroundColor: colors.secondary + '15',
  },
  levelText: {
    color: colors.primary,
    fontWeight: '600',
  },
  levelTextPadel: {
    color: colors.secondary,
  },
  openBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  openText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  fullBadge: {
    backgroundColor: '#FF980020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fullText: {
    color: '#FF9800',
    fontWeight: '600',
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

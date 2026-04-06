import { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, Button, Card, Icon } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMatches } from '@/contexts/MatchesContext';
import { useMembers } from '@/contexts/MembersContext';
import { useAuth } from '@/contexts/AuthContext';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { formatDate, formatTime, getFullName } from '@/utils/formatters';
import { sportTypeLabels, matchFormatLabels } from '@/data/categories';
import { colors } from '@/theme';

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { getMatchById, toggleParticipation, deleteMatch } = useMatches();
  const { getMemberById } = useMembers();
  const { currentUser } = useAuth();
  const router = useRouter();
  const match = getMatchById(matchId);
  const isAdmin = currentUser?.isAdmin === true;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!match) {
    return (
      <View style={styles.centered}>
        <Text>Kamp ikke fundet</Text>
      </View>
    );
  }

  const isTennis = match.sport === 'tennis';
  const creator = getMemberById(match.creatorId);
  const isPlayer = currentUser ? match.playerIds.includes(currentUser.id) : false;
  const isCreator = currentUser ? match.creatorId === currentUser.id : false;
  const isFull = match.playerIds.length >= match.maxPlayers;
  const isPast = match.status === 'completed' || match.status === 'cancelled';
  const spotsLeft = match.maxPlayers - match.playerIds.length;

  const handleToggle = () => {
    if (currentUser) {
      toggleParticipation(match.id, currentUser.id);
    }
  };

  const accentColor = isTennis ? colors.primary : colors.secondary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { borderBottomColor: accentColor }]}>
        <View style={[styles.sportBadge, { backgroundColor: accentColor + '20' }]}>
          <Icon
            source={isTennis ? 'tennis-ball' : 'racquetball'}
            size={28}
            color={accentColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall" style={styles.title}>
            {sportTypeLabels[match.sport]} {matchFormatLabels[match.format]}
          </Text>
          <View style={styles.headerBadges}>
            <View style={[styles.levelBadge, { backgroundColor: accentColor + '15' }]}>
              <Text variant="labelMedium" style={[styles.levelText, { color: accentColor }]}>
                Niveau {match.levelMin}–{match.levelMax}
              </Text>
            </View>
            <View style={[styles.statusBadge, statusColor(match.status)]}>
              <Text variant="labelSmall" style={{ color: statusColor(match.status).color, fontWeight: '600' }}>
                {match.status === 'open' ? 'Åben' : match.status === 'full' ? 'Fuld' : match.status === 'completed' ? 'Afsluttet' : 'Aflyst'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <DetailRow icon="calendar" label={formatDate(match.date)} />
          <DetailRow icon="clock-outline" label={`${formatTime(match.startTime)} - ${formatTime(match.endTime)}`} />
          <DetailRow icon="map-marker-outline" label={match.location} />
          <DetailRow
            icon="account-group-outline"
            label={`${match.playerIds.length} / ${match.maxPlayers} spillere${spotsLeft > 0 ? ` (${spotsLeft} ${spotsLeft > 1 ? 'pladser' : 'plads'} tilbage)` : ''}`}
          />
        </Card.Content>
      </Card>

      {!isPast && (
        <View style={styles.actionContainer}>
          {isCreator ? (
            <Button mode="outlined" icon="check" style={styles.actionBtn} disabled>
              Du oprettede denne kamp
            </Button>
          ) : (
            <Button
              mode={isPlayer ? 'outlined' : 'contained'}
              icon={isPlayer ? 'account-minus' : 'account-plus'}
              onPress={handleToggle}
              disabled={!isPlayer && isFull}
              style={styles.actionBtn}
              buttonColor={!isPlayer && !isFull ? accentColor : undefined}>
              {isPlayer ? 'Forlad kamp' : isFull ? 'Kampen er fuld' : 'Deltag i kamp'}
            </Button>
          )}
        </View>
      )}

      {match.description ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Beskrivelse</Text>
            <Text variant="bodyMedium" style={styles.description}>{match.description}</Text>
          </Card.Content>
        </Card>
      ) : null}

      {creator && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Oprettet af</Text>
            <View style={styles.memberRow}>
              <MemberAvatar
                firstName={creator.firstName}
                lastName={creator.lastName}
                avatarUrl={creator.avatarUrl}
                size={44}
              />
              <View>
                <Text variant="titleSmall">
                  {getFullName(creator.firstName, creator.lastName)}
                </Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  {creator.jobTitle}{creator.companyName ? ` hos ${creator.companyName}` : ''}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Spillere ({match.playerIds.length}/{match.maxPlayers})
          </Text>
          {match.playerIds.map((id) => {
            const member = getMemberById(id);
            if (!member) return null;
            const isMatchCreator = id === match.creatorId;
            return (
              <View key={id} style={styles.playerRow}>
                <MemberAvatar
                  firstName={member.firstName}
                  lastName={member.lastName}
                  avatarUrl={member.avatarUrl}
                  size={36}
                />
                <View style={styles.playerInfo}>
                  <Text variant="bodyMedium">
                    {getFullName(member.firstName, member.lastName)}
                  </Text>
                  {isMatchCreator && (
                    <Text variant="labelSmall" style={{ color: accentColor }}>Arrangør</Text>
                  )}
                </View>
              </View>
            );
          })}
          {spotsLeft > 0 && !isPast && (
            Array.from({ length: spotsLeft }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.playerRow}>
                <View style={styles.emptySlot}>
                  <Icon source="account-plus-outline" size={18} color={colors.onSurfaceVariant} />
                </View>
                <Text variant="bodyMedium" style={styles.emptyText}>Ledig plads</Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {isAdmin && (
        <View style={styles.deleteContainer}>
          {!showDeleteConfirm ? (
            <Button
              mode="outlined"
              icon="delete"
              textColor="#D32F2F"
              style={styles.deleteBtn}
              onPress={() => setShowDeleteConfirm(true)}>
              Slet kamp
            </Button>
          ) : (
            <View>
              <Text variant="bodyMedium" style={styles.deleteWarning}>
                Er du sikker på at du vil slette denne kamp?
              </Text>
              <View style={styles.deleteActions}>
                <Button
                  mode="outlined"
                  style={[styles.deleteActionBtn, { flex: 1 }]}
                  onPress={() => setShowDeleteConfirm(false)}>
                  Annuller
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#D32F2F"
                  style={[styles.deleteActionBtn, { flex: 1 }]}
                  onPress={async () => {
                    await deleteMatch(match.id);
                    router.back();
                  }}>
                  Ja, slet
                </Button>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'open': return { backgroundColor: '#4CAF5020', color: '#4CAF50' };
    case 'full': return { backgroundColor: '#FF980020', color: '#FF9800' };
    case 'completed': return { backgroundColor: '#9E9E9E20', color: '#9E9E9E' };
    default: return { backgroundColor: '#F4433620', color: '#F44336' };
  }
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 3,
  },
  sportBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
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
  actionContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  actionBtn: {
    borderRadius: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  playerInfo: {
    flex: 1,
  },
  emptySlot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  deleteContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  deleteBtn: {
    borderColor: '#D32F2F',
    borderRadius: 12,
  },
  deleteWarning: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteActionBtn: {
    borderRadius: 12,
  },
});

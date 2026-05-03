import { useState } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { SegmentedButtons, FAB, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useEvents } from '@/contexts/EventsContext';
import { useMatches } from '@/contexts/MatchesContext';
import { useAuth } from '@/contexts/AuthContext';
import { EventCard } from '@/components/events/EventCard';
import { MatchCard } from '@/components/matches/MatchCard';
import { TennisBallBackground } from '@/components/TennisBallBackground';
import { colors } from '@/theme';

export default function EventsScreen() {
  const [segment, setSegment] = useState('matches');
  const { getUpcomingEvents, getPastEvents, getMyEvents } = useEvents();
  const { getOpenMatches, getMyMatches } = useMatches();
  const { currentUser } = useAuth();

  const events =
    segment === 'upcoming'
      ? getUpcomingEvents()
      : segment === 'past'
        ? getPastEvents()
        : segment === 'mine'
          ? currentUser
            ? getMyEvents(currentUser.id)
            : []
          : [];

  const matches =
    segment === 'matches'
      ? getOpenMatches()
      : [];

  const isMatchSegment = segment === 'matches';

  return (
    <View style={styles.container}>
      <TennisBallBackground />
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={segment}
          onValueChange={setSegment}
          buttons={[
            { value: 'matches', label: 'Kampe' },
            { value: 'upcoming', label: 'Kommende' },
            { value: 'past', label: 'Tidligere' },
            { value: 'mine', label: 'Mine' },
          ]}
          style={styles.segments}
        />
      </View>
      {isMatchSegment ? (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                Ingen kampe fundet
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                Ingen begivenheder fundet
              </Text>
            </View>
          }
        />
      )}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push(isMatchSegment ? '/events/create-match' : '/events/create')}
        color={colors.onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segments: {},
  list: {
    paddingBottom: 80,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
  },
});

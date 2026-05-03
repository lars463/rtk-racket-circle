import { StyleSheet, ScrollView, View, Pressable, ImageBackground } from 'react-native';
import { Text, Card, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/contexts/MembersContext';
import { useEvents } from '@/contexts/EventsContext';
import { useMessages } from '@/contexts/MessagesContext';
import { EventCard } from '@/components/events/EventCard';
import { TennisBallBackground } from '@/components/TennisBallBackground';
import { colors } from '@/theme';

const clubHero = require('@/assets/images/club-hero.jpg');

export default function HomeScreen() {
  const { currentUser } = useAuth();
  const { members } = useMembers();
  const { getUpcomingEvents } = useEvents();
  const { getUnreadCount } = useMessages();

  const isAdmin = currentUser?.isAdmin === true;
  const activeMembers = isAdmin ? members : members.filter((m) => m.isActive !== false);
  const upcomingEvents = getUpcomingEvents().slice(0, 3);
  const unread = getUnreadCount();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TennisBallBackground />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ImageBackground source={clubHero} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay}>
            <Text variant="headlineSmall" style={styles.heroGreeting}>
              RTK Racket Circle
            </Text>
            <Text variant="headlineMedium" style={styles.heroName}>
              Hej, {currentUser?.firstName ?? 'Medlem'}
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.statsRow}>
          <Pressable style={styles.statCard} onPress={() => router.push('/directory')}>
            <Icon source="account-group" size={28} color={colors.primary} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {activeMembers.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>Medlemmer</Text>
          </Pressable>
          <Pressable style={styles.statCard} onPress={() => router.push('/events')}>
            <Icon source="calendar" size={28} color={colors.secondary} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {upcomingEvents.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>Kommende</Text>
          </Pressable>
          <Pressable style={styles.statCard} onPress={() => router.push('/messages')}>
            <Icon source="message" size={28} color={colors.info} />
            <Text variant="headlineSmall" style={styles.statNumber}>
              {unread}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>Ulæste</Text>
          </Pressable>
        </View>

        <View style={styles.quickActions}>
          <Card style={styles.actionCard} onPress={() => router.push('/directory')}>
            <Card.Content style={styles.actionContent}>
              <Icon source="account-search" size={24} color={colors.primary} />
              <Text variant="titleSmall">Find et medlem</Text>
            </Card.Content>
          </Card>
          <Card style={styles.actionCard} onPress={() => router.push('/events/create')}>
            <Card.Content style={styles.actionContent}>
              <Icon source="plus-circle" size={24} color={colors.secondary} />
              <Text variant="titleSmall">Opret event</Text>
            </Card.Content>
          </Card>
          <Card style={styles.actionCard} onPress={() => router.push('/events/create-match')}>
            <Card.Content style={styles.actionContent}>
              <Icon source="tennis" size={24} color={colors.primary} />
              <Text variant="titleSmall">Opret kamp</Text>
            </Card.Content>
          </Card>
        </View>

        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge">Kommende begivenheder</Text>
              <Pressable onPress={() => router.push('/events')}>
                <Text variant="labelLarge" style={styles.seeAll}>Se alle</Text>
              </Pressable>
            </View>
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </View>
        )}

        <ImageBackground source={clubHero} style={styles.footer} resizeMode="cover">
          <View style={styles.footerOverlay}>
            <Text variant="titleMedium" style={styles.footerText}>
              Erhvervsnetværk · Roskilde Tennis Klub
            </Text>
          </View>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 0,
  },
  hero: {
    height: 180,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.85)',
  },
  heroName: {
    color: '#fff',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statNumber: {
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  seeAll: {
    color: colors.primary,
  },
  footer: {
    height: 180,
    marginTop: 16,
    justifyContent: 'flex-end',
  },
  footerOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
});

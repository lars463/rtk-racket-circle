import { StyleSheet, ScrollView, View, Linking, ImageBackground } from 'react-native';
import { Text, Card, Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMembers } from '@/contexts/MembersContext';
import { TennisBallBackground } from '@/components/TennisBallBackground';
import { colors } from '@/theme';

const clubHero = require('@/assets/images/club-hero.jpg');

export default function AboutScreen() {
  const { members } = useMembers();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TennisBallBackground />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ImageBackground source={clubHero} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay}>
            <Text variant="headlineLarge" style={styles.heroTitle}>
              RTK Racket Circle
            </Text>
            <Text variant="titleMedium" style={styles.heroSubtitle}>
              Erhvervsnetværk
            </Text>
          </View>
        </ImageBackground>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Om os</Text>
            <Text variant="bodyMedium" style={styles.body}>
              RTK Racket Circle er fællesskabet for erhvervsaktive medlemmer af Roskilde Tennis Klub, uanset om du er leder, iværksætter, håndværksmester, offentlig professionel eller noget helt andet.
            </Text>
            <Text variant="bodyMedium" style={[styles.body, { marginTop: 10 }]}>
              Vi samler mennesker primært mellem 25 og 65 år der deler en passion for tennis og padel og som ønsker at bidrage til RTK's ambition om at blive en af Danmarks bedste og mest dynamiske tennisklubber.
            </Text>
            <Text variant="bodyMedium" style={[styles.body, { marginTop: 10 }]}>
              Gennem spil og kamp matching, kvartalsvise arrangementer, turneringer og sociale aktiviteter skaber vi rammerne for meningsfulde forbindelser på tværs af brancher - både på og uden for banen. Forbindelser der ikke bare styrker dit netværk, men som også bringer unikke kompetencer ind i klubbens fortsatte udvikling.
            </Text>
            <Text variant="bodyMedium" style={[styles.body, { marginTop: 10 }]}>
              Du kender folk når du møder dem på banen. Og de kender dig.
            </Text>
            <Text variant="bodyMedium" style={[styles.body, { marginTop: 10, fontStyle: 'italic' }]}>
              Racket Circle er ikke en officiel del af RTK. Vi er medlemmer af klubben der har dannet fællesskabet på eget initiativ - men vi arbejder i tæt dialog med klubben om at bidrage til dens udvikling.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Vores mission</Text>
            <Text variant="bodyMedium" style={styles.body}>
              Vi vil bidrage aktivt til RTK's ambition om at blive Danmarks bedste tennisklub - en klub der løfter både eliten, bredden og ungdommen, og som er et stærkt samlingspunkt i lokalsamfundet. Vi stiller vores kompetencer, netværk og engagement til rådighed for klubbens udvikling, og bygger samtidig et erhvervsfællesskab hvor sport, mennesker og forretning mødes.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Fællesskabet i praksis</Text>
            <FeatureRow icon="handshake" text="Netværk med andre tennis og padel interesserede erhvervsaktive" />
            <FeatureRow icon="tennis" text="Kampe, turneringer og nem matchmaking" />
            <FeatureRow icon="glass-cocktail" text="Sociale arrangementer og mixere" />
            <FeatureRow icon="handshake-outline" text="Sponsor onboarding og events" />
            <FeatureRow icon="airplane" text="Ture til tennis og padel turneringer" />
            <FeatureRow icon="lightbulb-on-outline" text="Muligheden for selv at bidrage - med kompetencer, kontakter eller bare en god idé" />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Netværket i tal</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text variant="headlineMedium" style={styles.statNumber}>{members.length}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Medlemmer</Text>
              </View>
              <View style={styles.stat}>
                <Text variant="headlineMedium" style={styles.statNumber}>2</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Sportsgrene</Text>
              </View>
              <View style={styles.stat}>
                <Text variant="headlineMedium" style={styles.statNumber}>2026</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Grundlagt</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Kontakt</Text>
            <ContactRow
              icon="email"
              label="Email"
              value="racketcircle@outlook.com"
              onPress={() => Linking.openURL('mailto:racketcircle@outlook.com')}
            />
            <ContactRow
              icon="web"
              label="Hjemmeside"
              value="www.racketcircle.dk"
              onPress={() => Linking.openURL('https://www.racketcircle.dk')}
            />
          </Card.Content>
        </Card>

        <Text variant="bodySmall" style={styles.footer}>
          RTK Racket Circle - Erhvervsnetværk{'\n'}Roskilde Tennis Klub
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={featureStyles.row}>
      <Icon source={icon} size={22} color={colors.primary} />
      <Text variant="bodyMedium" style={featureStyles.text}>{text}</Text>
    </View>
  );
}

function ContactRow({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) {
  return (
    <View style={contactStyles.row}>
      <Icon source={icon} size={20} color={colors.onSurfaceVariant} />
      <View style={contactStyles.info}>
        <Text variant="bodySmall" style={contactStyles.label}>{label}</Text>
        <Text
          variant="bodyMedium"
          style={[contactStyles.value, onPress && contactStyles.link]}
          onPress={onPress}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  text: {
    color: colors.onSurface,
    flex: 1,
  },
});

const contactStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  info: {
    flex: 1,
  },
  label: {
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  value: {
    color: colors.onSurface,
  },
  link: {
    color: colors.primary,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 30,
  },
  hero: {
    height: 220,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    color: colors.onSurface,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    marginTop: 24,
    marginBottom: 10,
  },
});

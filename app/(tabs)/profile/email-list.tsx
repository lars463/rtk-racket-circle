import { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, Linking, Platform } from 'react-native';
import { Text, Button, Card, Icon, RadioButton, Snackbar } from 'react-native-paper';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/contexts/MembersContext';
import { colors } from '@/theme';

type Separator = ', ' | '; ';
type Recipients = 'all' | 'event' | 'match' | 'message';

const RECIPIENT_LABEL: Record<Recipients, string> = {
  all: 'Alle aktive medlemmer',
  event: 'Modtagere af event-emails',
  match: 'Modtagere af kamp-emails',
  message: 'Modtagere af besked-emails',
};

export default function EmailListScreen() {
  const { currentUser } = useAuth();
  const { members } = useMembers();
  const [separator, setSeparator] = useState<Separator>('; ');
  const [filter, setFilter] = useState<Recipients>('all');
  const [snack, setSnack] = useState<string | null>(null);

  if (!currentUser?.isAdmin) {
    return (
      <View style={styles.centered}>
        <Text>Kun admins har adgang til denne side.</Text>
      </View>
    );
  }

  const recipients = useMemo(() => {
    return members
      .filter((m) => m.isActive !== false)
      .filter((m) => {
        if (filter === 'all') return true;
        if (filter === 'event') return m.notificationNewEvent !== false;
        if (filter === 'match') return m.notificationNewMatch !== false;
        if (filter === 'message') return m.notificationNewMessage !== false;
        return true;
      })
      .map((m) => ({ name: `${m.firstName} ${m.lastName}`, email: m.email }))
      .filter((r) => !!r.email);
  }, [members, filter]);

  const joinedEmails = recipients.map((r) => r.email).join(separator);

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(joinedEmails);
      } else {
        // Fallback for native — would need expo-clipboard. Web is the
        // primary target so we leave this as a no-op with a hint.
        return setSnack('Kopiering virker kun i web-versionen lige nu.');
      }
      setSnack(`${recipients.length} email-adresser kopieret til udklipsholder.`);
    } catch (e) {
      setSnack('Kunne ikke kopiere: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleMailto = () => {
    // BCC for privacy — recipients don't see each other's addresses
    const url = `mailto:?bcc=${encodeURIComponent(joinedEmails)}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = url;
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3000}>
        {snack ?? ''}
      </Snackbar>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Hvem skal med?</Text>
          <RadioButton.Group onValueChange={(v) => setFilter(v as Recipients)} value={filter}>
            {(['all', 'event', 'match', 'message'] as Recipients[]).map((key) => (
              <RadioButton.Item key={key} label={RECIPIENT_LABEL[key]} value={key} />
            ))}
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Adskillelse mellem adresser</Text>
          <RadioButton.Group onValueChange={(v) => setSeparator(v as Separator)} value={separator}>
            <RadioButton.Item label="Semikolon ; (Outlook)" value="; " />
            <RadioButton.Item label="Komma , (Gmail mfl.)" value=", " />
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <Icon source="email-multiple-outline" size={22} color={colors.primary} />
            <Text variant="titleMedium" style={styles.summaryText}>
              {recipients.length} {recipients.length === 1 ? 'modtager' : 'modtagere'}
            </Text>
          </View>

          <Button
            mode="contained"
            icon="content-copy"
            onPress={handleCopy}
            style={styles.actionBtn}
            disabled={recipients.length === 0}>
            Kopiér alle email-adresser
          </Button>

          <Button
            mode="outlined"
            icon="email-outline"
            onPress={handleMailto}
            style={styles.actionBtn}
            disabled={recipients.length === 0}>
            Åbn i mail-klient (BCC)
          </Button>

          <Text variant="bodySmall" style={styles.hint}>
            Tip: Brug BCC i stedet for To/Cc, så modtagerne ikke kan se hinandens email-adresser.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Forhåndsvisning</Text>
          <Text variant="bodySmall" selectable style={styles.preview}>
            {joinedEmails || '(ingen modtagere matcher filteret)'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Modtagerliste</Text>
          {recipients.map((r) => (
            <View key={r.email} style={styles.listRow}>
              <Text variant="bodyMedium" style={styles.listName}>{r.name}</Text>
              <Text variant="bodySmall" selectable style={styles.listEmail}>{r.email}</Text>
            </View>
          ))}
          {recipients.length === 0 && (
            <Text variant="bodyMedium" style={styles.empty}>Ingen modtagere</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 30 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: { marginHorizontal: 16, marginTop: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  summaryText: { fontWeight: '700', color: colors.primary },
  actionBtn: { marginTop: 8, borderRadius: 12 },
  hint: { color: colors.onSurfaceVariant, marginTop: 12, fontStyle: 'italic' },
  preview: {
    color: colors.onSurface,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  listRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  listName: { fontWeight: '600' },
  listEmail: { color: colors.onSurfaceVariant },
  empty: { color: colors.onSurfaceVariant, fontStyle: 'italic' },
});

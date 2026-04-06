import { StyleSheet, FlatList, View } from 'react-native';
import { FAB, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useMessages } from '@/contexts/MessagesContext';
import { ConversationItem } from '@/components/messages/ConversationItem';
import { TennisBallBackground } from '@/components/TennisBallBackground';
import { colors } from '@/theme';

export default function MessagesScreen() {
  const { conversations } = useMessages();

  return (
    <View style={styles.container}>
      <TennisBallBackground />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationItem conversation={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Ingen samtaler endnu
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Tryk på blyant-ikonet for at starte en ny samtale
            </Text>
          </View>
        }
      />
      <FAB
        icon="pencil"
        style={styles.fab}
        onPress={() => router.push('/new-message')}
        color={colors.onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    paddingBottom: 80,
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginLeft: 78,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.onSurfaceVariant,
  },
  emptySubtext: {
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
  },
});

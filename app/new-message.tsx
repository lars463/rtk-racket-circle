import { useState } from 'react';
import { StyleSheet, FlatList, View, Pressable } from 'react-native';
import { Searchbar, Text, Button, Icon, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { useMembers } from '@/contexts/MembersContext';
import { useMessages } from '@/contexts/MessagesContext';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { getFullName } from '@/utils/formatters';
import { colors } from '@/theme';

export default function NewMessageScreen() {
  const { members, search } = useMembers();
  const { startConversation } = useMessages();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const otherMembers = members.filter((m) => m.id !== currentUser?.id && m.isActive !== false);
  const filteredMembers = (query ? search(query) : otherMembers).filter(
    (m) => m.id !== currentUser?.id
  );

  const allSelected = selectedIds.length === otherMembers.length;

  const toggleMember = (memberId: string) => {
    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(otherMembers.map((m) => m.id));
    }
  };

  const handleStart = async () => {
    if (selectedIds.length === 0 || sending) return;
    setSending(true);
    const conversationId = await startConversation(selectedIds);
    setSending(false);
    if (!conversationId) return;
    router.dismiss();
    setTimeout(() => {
      router.push(`/messages/${conversationId}`);
    }, 300);
  };

  const selectedMembers = otherMembers.filter((m) => selectedIds.includes(m.id));

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Søg medlemmer..."
        value={query}
        onChangeText={setQuery}
        style={styles.searchbar}
      />

      {selectedMembers.length > 0 && (
        <View style={styles.selectedRow}>
          {selectedMembers.map((m) => (
            <Chip
              key={m.id}
              onClose={() => toggleMember(m.id)}
              style={styles.chip}
              textStyle={styles.chipText}>
              {m.firstName}
            </Chip>
          ))}
        </View>
      )}

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Pressable
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            onPress={toggleAll}>
            <View style={[styles.allIcon, allSelected && styles.allIconSelected]}>
              <Icon source="account-group" size={24} color={allSelected ? '#fff' : colors.primary} />
            </View>
            <View style={styles.itemText}>
              <Text variant="titleSmall" style={{ fontWeight: '600' }}>Alle medlemmer</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Send til alle ({otherMembers.length})
              </Text>
            </View>
            {allSelected && (
              <Icon source="check-circle" size={24} color={colors.primary} />
            )}
          </Pressable>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <Pressable
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              onPress={() => toggleMember(item.id)}>
              <MemberAvatar
                firstName={item.firstName}
                lastName={item.lastName}
                avatarUrl={item.avatarUrl}
                size={44}
              />
              <View style={styles.itemText}>
                <Text variant="titleSmall">
                  {getFullName(item.firstName, item.lastName)}
                </Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  {item.jobTitle}{item.companyName ? ` hos ${item.companyName}` : ''}
                </Text>
              </View>
              {isSelected && (
                <Icon source="check-circle" size={24} color={colors.primary} />
              )}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />

      {selectedIds.length > 0 && (
        <View style={styles.bottomBar}>
          <Button
            mode="contained"
            onPress={handleStart}
            loading={sending}
            disabled={sending}
            style={styles.startBtn}
            contentStyle={styles.startBtnContent}
            icon="message-plus">
            {selectedIds.length === 1
              ? 'Start samtale'
              : `Start gruppesamtale (${selectedIds.length})`}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  chip: {
    backgroundColor: colors.background,
  },
  chipText: {
    fontSize: 13,
  },
  list: {
    paddingBottom: 100,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: {
    backgroundColor: '#f0f0f0',
  },
  itemText: {
    flex: 1,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  allIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allIconSelected: {
    backgroundColor: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginLeft: 72,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  startBtn: {
    borderRadius: 12,
  },
  startBtnContent: {
    paddingVertical: 6,
  },
});

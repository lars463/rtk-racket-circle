import { useState, useMemo } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { Searchbar, Text, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { useMembers } from '@/contexts/MembersContext';
import { useAuth } from '@/contexts/AuthContext';
import { MemberCard } from '@/components/members/MemberCard';
import { Member } from '@/types';
import { TennisBallBackground } from '@/components/TennisBallBackground';
import { colors } from '@/theme';

export default function DirectoryScreen() {
  const { members, search } = useMembers();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const isAdmin = currentUser?.isAdmin === true;

  const filteredMembers = useMemo(() => {
    let result: Member[] = query ? search(query) : members;
    // Hide deactivated members from non-admin users
    if (!isAdmin) {
      result = result.filter((m) => m.isActive !== false);
    }
    return result;
  }, [members, query, search, isAdmin]);

  return (
    <View style={styles.container}>
      <TennisBallBackground />
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Søg medlemmer..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
      </View>
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemberCard member={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Ingen medlemmer fundet
            </Text>
          </View>
        }
      />
      {isAdmin && (
        <FAB
          icon="account-plus"
          style={styles.fab}
          onPress={() => router.push('/directory/add-member')}
          color={colors.onPrimary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchbar: {
    borderRadius: 12,
    elevation: 1,
  },
  searchInput: {
    minHeight: 0,
  },
  list: {
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.onSurfaceVariant,
  },
});

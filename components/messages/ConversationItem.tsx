import { StyleSheet, View, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { Conversation } from '@/types';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { useMembers } from '@/contexts/MembersContext';
import { useAuth } from '@/contexts/AuthContext';
import { getFullName, formatMessageTime } from '@/utils/formatters';
import { colors } from '@/theme';

interface ConversationItemProps {
  conversation: Conversation;
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { getMemberById } = useMembers();
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? '';
  const otherIds = conversation.participantIds.filter((id) => id !== currentUserId);
  const others = otherIds.map((id) => getMemberById(id)).filter(Boolean);

  if (others.length === 0) return null;

  const isGroup = others.length > 1;
  const displayName = isGroup
    ? others.map((m) => m!.firstName).join(', ')
    : getFullName(others[0]!.firstName, others[0]!.lastName);
  const firstOther = others[0]!;

  const hasUnread =
    conversation.lastMessage &&
    !conversation.lastMessage.read &&
    conversation.lastMessage.senderId !== currentUserId;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => router.push(`/messages/${conversation.id}`)}>
      {isGroup ? (
        <View style={styles.groupAvatar}>
          <Icon source="account-group" size={26} color={colors.primary} />
        </View>
      ) : (
        <MemberAvatar
          firstName={firstOther.firstName}
          lastName={firstOther.lastName}
          avatarUrl={firstOther.avatarUrl}
          size={50}
        />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            variant="titleSmall"
            style={[hasUnread ? styles.unreadName : undefined, isGroup && { fontSize: 13 }]}
            numberOfLines={1}>
            {displayName}
          </Text>
          {conversation.lastMessage && (
            <Text variant="bodySmall" style={styles.time}>
              {formatMessageTime(conversation.lastMessage.timestamp)}
            </Text>
          )}
        </View>
        {conversation.lastMessage && (
          <Text
            variant="bodyMedium"
            style={[styles.preview, hasUnread && styles.unreadPreview]}
            numberOfLines={1}>
            {conversation.lastMessage.senderId === currentUserId ? 'Dig: ' : ''}
            {conversation.lastMessage.text}
          </Text>
        )}
      </View>
      {hasUnread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    color: colors.onSurfaceVariant,
  },
  preview: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  unreadName: {
    fontWeight: '700',
  },
  unreadPreview: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});

import { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, FlatList, KeyboardAvoidingView, Platform, View, Alert, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useMessages } from '@/contexts/MessagesContext';
import { useMembers } from '@/contexts/MembersContext';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageInput } from '@/components/messages/MessageInput';
import { getFullName } from '@/utils/formatters';
import { colors } from '@/theme';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { getConversation, getMessages, sendMessage, deleteConversation, markAsRead } = useMessages();
  const { getMemberById } = useMembers();
  const { currentUser } = useAuth();
  const navigation = useNavigation();
  const isAdmin = currentUser?.isAdmin === true;

  const conversation = getConversation(conversationId);
  const messages = getMessages(conversationId);
  const flatListRef = useRef<FlatList>(null);

  const otherIds = conversation?.participantIds.filter((id) => id !== currentUser?.id) ?? [];
  const others = otherIds.map((id) => getMemberById(id)).filter(Boolean);
  const isGroup = others.length > 1;
  const chatTitle = isGroup
    ? others.map((m) => m!.firstName).join(', ')
    : others[0] ? getFullName(others[0].firstName, others[0].lastName) : 'Samtale';

  const handleDeleteConversation = useCallback(() => {
    const doDelete = () => {
      deleteConversation(conversationId);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (confirm('Er du sikker på at du vil slette denne samtale?')) {
        doDelete();
      }
    } else {
      Alert.alert('Slet samtale', 'Er du sikker på at du vil slette denne samtale?', [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Slet', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [deleteConversation, conversationId]);

  useEffect(() => {
    if (others.length > 0) {
      navigation.setOptions({
        title: chatTitle,
        headerRight: isAdmin
          ? () => (
              <Pressable onPress={handleDeleteConversation} style={{ padding: 8 }}>
                <Icon source="delete" size={22} color="#D32F2F" />
              </Pressable>
            )
          : undefined,
      });
    }
  }, [chatTitle, navigation, isAdmin, handleDeleteConversation]);

  // Mark messages as read when conversation opens and when new messages arrive
  useEffect(() => {
    if (conversationId) {
      markAsRead(conversationId);
    }
  }, [conversationId, messages.length, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = (text: string) => {
    sendMessage(conversationId, text);
  };

  if (!conversation) {
    return (
      <View style={styles.centered}>
        <Text>Samtale ikke fundet</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />
      <MessageInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 10,
  },
});

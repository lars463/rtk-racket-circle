import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Conversation, Message } from '@/types';
import { MessageRow } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { notifyNewMessage } from '@/lib/notifications';

/** Shape returned by the get_my_conversations RPC */
interface RpcConversation {
  id: string;
  created_at: string;
  last_message_at: string | null;
  participant_ids: string[];
  last_message: {
    id: string;
    conversation_id: string;
    sender_id: string;
    text: string;
    created_at: string;
    is_read: boolean;
  } | null;
  messages: Array<{
    id: string;
    conversation_id: string;
    sender_id: string;
    text: string;
    created_at: string;
    is_read: boolean;
  }>;
}

interface MessagesContextType {
  conversations: Conversation[];
  isLoading: boolean;
  getConversation: (id: string) => Conversation | undefined;
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  startConversation: (participantIds: string[]) => Promise<string>;
  getUnreadCount: () => number;
  deleteConversation: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType>({
  conversations: [],
  isLoading: true,
  getConversation: () => undefined,
  getMessages: () => [],
  sendMessage: async () => {},
  startConversation: async () => '',
  getUnreadCount: () => 0,
  deleteConversation: async () => {},
  markAsRead: async () => {},
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserId = currentUser?.id ?? '';

  // Load conversations and messages from Supabase via RPC (bypasses RLS)
  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setMessages([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_my_conversations');

        if (error || !data) {
          console.error('Get conversations RPC error:', error);
          setIsLoading(false);
          return;
        }

        const rawConvs: RpcConversation[] = Array.isArray(data) ? data : [];

        const convs: Conversation[] = rawConvs.map((c) => {
          const lm = c.last_message;
          const lastMsg = lm ? {
            id: lm.id,
            conversationId: lm.conversation_id,
            senderId: lm.sender_id,
            text: lm.text,
            timestamp: lm.created_at,
            read: lm.is_read,
          } : null;

          return {
            id: c.id,
            participantIds: c.participant_ids ?? [],
            lastMessage: lastMsg,
            createdAt: c.created_at,
            updatedAt: c.last_message_at ?? c.created_at,
          };
        });

        const msgs: Message[] = rawConvs.flatMap((c) =>
          (c.messages ?? []).map((m) => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            text: m.text,
            timestamp: m.created_at,
            read: m.is_read,
          }))
        );

        setConversations(convs);
        setMessages(msgs);
      } catch (e) {
        console.error('Failed to fetch conversations:', e);
      }
      setIsLoading(false);
    })();
  }, [currentUserId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as MessageRow;
        // Only process if it's in one of our conversations
        const newMsg: Message = {
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          text: m.text,
          timestamp: m.created_at,
          read: m.is_read,
        };

        setMessages((prev) => {
          if (prev.find((msg) => msg.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Update conversation's last message
        setConversations((prev) =>
          prev.map((c) =>
            c.id === newMsg.conversationId
              ? { ...c, lastMessage: newMsg, updatedAt: newMsg.timestamp }
              : c
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  const getMessages = useCallback(
    (conversationId: string) =>
      messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [messages]
  );

  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      if (!currentUserId) return;

      try {
        // Use RPC to send message server-side (bypasses RLS)
        const { data: msgId, error } = await supabase.rpc('send_message', {
          p_conversation_id: conversationId,
          p_text: text,
        });

        if (error || !msgId) {
          console.error('Send message RPC error:', error);
          return;
        }

        const now = new Date().toISOString();
        const newMsg: Message = {
          id: msgId,
          conversationId,
          senderId: currentUserId,
          text,
          timestamp: now,
          read: true,
        };

        // Update local state immediately
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, lastMessage: newMsg, updatedAt: now }
              : c
          )
        );

        // Send email notifications to other participants
        try {
          const conv = conversations.find((c) => c.id === conversationId);
          if (conv) {
            const senderName = currentUser
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : 'Ukendt';

            for (const pid of conv.participantIds) {
              if (pid !== currentUserId) {
                notifyNewMessage(pid, senderName, text);
              }
            }
          }
        } catch (e) {
          console.error('Failed to send message notifications:', e);
        }
      } catch (e) {
        console.error('Send message error:', e);
      }
    },
    [currentUserId, currentUser, conversations]
  );

  const startConversation = useCallback(
    async (participantIds: string[]) => {
      if (!currentUserId || participantIds.length === 0) return '';

      try {
        // Use RPC to handle conversation creation server-side (bypasses RLS)
        const { data: convId, error } = await supabase.rpc('start_conversation', {
          other_user_ids: participantIds,
        });

        if (error || !convId) {
          console.error('Start conversation RPC error:', error);
          return '';
        }

        // Add to local state if not already there
        setConversations((prev) => {
          if (prev.find((c) => c.id === convId)) return prev;
          return [{
            id: convId,
            participantIds: [currentUserId, ...participantIds],
            lastMessage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, ...prev];
        });

        return convId;
      } catch (e) {
        console.error('Start conversation error:', e);
        return '';
      }
    },
    [currentUserId]
  );

  const getUnreadCount = useCallback(() => {
    // Count conversations with unread messages (not total unread messages)
    const convsWithUnread = new Set(
      messages
        .filter((m) => !m.read && m.senderId !== currentUserId)
        .map((m) => m.conversationId)
    );
    return convsWithUnread.size;
  }, [messages, currentUserId]);

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!currentUserId) return;

      try {
        // Update unread messages in Supabase
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', currentUserId)
          .eq('is_read', false);

        // Update local state
        setMessages((prev) =>
          prev.map((m) =>
            m.conversationId === conversationId && m.senderId !== currentUserId && !m.read
              ? { ...m, read: true }
              : m
          )
        );

        // Update last message read status in conversation
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId || !c.lastMessage) return c;
            if (c.lastMessage.senderId !== currentUserId && !c.lastMessage.read) {
              return { ...c, lastMessage: { ...c.lastMessage, read: true } };
            }
            return c;
          })
        );
      } catch (e) {
        console.error('Mark as read error:', e);
      }
    },
    [currentUserId]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await supabase.from('conversations').delete().eq('id', conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        setMessages((prev) => prev.filter((m) => m.conversationId !== conversationId));
      } catch (e) {
        console.error('Delete conversation error:', e);
      }
    },
    []
  );

  // Sort conversations by most recent activity
  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || '')
    ),
    [conversations]
  );

  return (
    <MessagesContext.Provider
      value={{
        conversations: sortedConversations,
        isLoading,
        getConversation,
        getMessages,
        sendMessage,
        startConversation,
        getUnreadCount,
        deleteConversation,
        markAsRead,
      }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}

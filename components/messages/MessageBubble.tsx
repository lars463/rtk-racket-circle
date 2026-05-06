import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { colors } from '@/theme';

interface MessageBubbleProps {
  message: Message;
  senderName?: string;
  showSenderName?: boolean;
}

export function MessageBubble({ message, senderName, showSenderName }: MessageBubbleProps) {
  const { currentUser } = useAuth();
  const isOwn = message.senderId === currentUser?.id;
  const showName = showSenderName && !isOwn && !!senderName;

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {showName && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.text, isOwn ? styles.ownText : styles.otherText]}>
          {message.text}
        </Text>
        <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
          {format(new Date(message.timestamp), 'HH:mm')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 3,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginLeft: 12,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E8E8E8',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: colors.onBackground,
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  ownTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherTime: {
    color: colors.onSurfaceVariant,
  },
});

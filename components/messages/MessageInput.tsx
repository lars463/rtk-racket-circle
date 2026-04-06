import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput, IconButton } from 'react-native-paper';
import { colors } from '@/theme';

interface MessageInputProps {
  onSend: (text: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Skriv en besked..."
        mode="outlined"
        dense
        outlineStyle={styles.outline}
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />
      <IconButton
        icon="send"
        iconColor={colors.onPrimary}
        containerColor={colors.primary}
        size={22}
        onPress={handleSend}
        disabled={!text.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    marginRight: 6,
    backgroundColor: '#fff',
  },
  outline: {
    borderRadius: 20,
  },
});

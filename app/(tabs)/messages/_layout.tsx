import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Beskeder' }} />
      <Stack.Screen name="[conversationId]" options={{ title: 'Samtale' }} />
    </Stack>
  );
}

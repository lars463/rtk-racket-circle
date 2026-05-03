import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Kampe & Begivenheder' }} />
      <Stack.Screen name="[eventId]" options={{ title: 'Begivenhedsdetaljer' }} />
      <Stack.Screen name="create" options={{ title: 'Opret begivenhed' }} />
      <Stack.Screen name="create-match" options={{ title: 'Opret kamp' }} />
      <Stack.Screen name="match/[matchId]" options={{ title: 'Kampdetaljer' }} />
    </Stack>
  );
}

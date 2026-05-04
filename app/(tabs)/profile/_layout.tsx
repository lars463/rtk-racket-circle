import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Min profil' }} />
      <Stack.Screen name="edit" options={{ title: 'Rediger profil' }} />
      <Stack.Screen name="change-password" options={{ title: 'Skift adgangskode' }} />
      <Stack.Screen name="email-list" options={{ title: 'Email-liste' }} />
    </Stack>
  );
}

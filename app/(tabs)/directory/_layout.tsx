import { Stack } from 'expo-router';

export default function DirectoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Medlemsoversigt' }} />
      <Stack.Screen name="[memberId]" options={{ title: 'Medlemsprofil' }} />
      <Stack.Screen name="add-member" options={{ title: 'Opret nyt medlem' }} />
    </Stack>
  );
}

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MembersProvider } from '@/contexts/MembersContext';
import { EventsProvider } from '@/contexts/EventsContext';
import { MatchesProvider } from '@/contexts/MatchesContext';
import { MessagesProvider } from '@/contexts/MessagesContext';
import { supabase } from '@/lib/supabase';
import { appTheme } from '@/theme';

function RootNavigator() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isRecovery, setIsRecovery] = useState(false);

  // Listen for PASSWORD_RECOVERY event from Supabase Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        router.replace('/reset-password');
      } else if (event === 'SIGNED_OUT') {
        // Reset recovery flag on sign-out so normal redirects resume
        setIsRecovery(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (isRecovery) return; // Don't redirect during password recovery

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

    if (!currentUser && !inAuthGroup) {
      // Not logged in → redirect to login
      router.replace('/login');
    } else if (currentUser && inAuthGroup && segments[0] !== 'reset-password') {
      // Logged in but on login screen → redirect to tabs (but allow reset-password)
      router.replace('/');
    }
  }, [currentUser, isLoading, segments, isRecovery]);

  return (
    <>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="new-message"
          options={{ presentation: 'modal', title: 'Ny besked' }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  // Set document language and inject tennis ball background on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.lang = 'da-DK';

    }
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <AuthProvider>
          <MembersProvider>
            <EventsProvider>
              <MatchesProvider>
                <MessagesProvider>
                  <RootNavigator />
                </MessagesProvider>
              </MatchesProvider>
            </EventsProvider>
          </MembersProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

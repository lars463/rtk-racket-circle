import { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessages } from '@/contexts/MessagesContext';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { getUnreadCount } = useMessages();
  const unread = getUnreadCount();

  // On iOS PWA standalone, useSafeAreaInsets() can return 0 even when the
  // CSS env(safe-area-inset-bottom) is non-zero. Read the real value from
  // CSS env() at mount and use the larger of the two so the tab bar
  // actually extends into the home-indicator safe area.
  const [cssEnvBottom, setCssEnvBottom] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    document.body.appendChild(el);
    const px = parseFloat(getComputedStyle(el).paddingBottom) || 0;
    document.body.removeChild(el);
    setCssEnvBottom(px);
  }, []);
  const safeBottom = Math.max(insets.bottom, cssEnvBottom);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
        tabBarLabelStyle: { fontSize: 10 },
        // Explicit tab bar sizing so the white background extends all the
        // way to the home indicator. height = icons + labels (~50) + the
        // safe-area inset; paddingBottom pushes content up so it stays
        // above the safe area zone.
        tabBarStyle: {
          height: 50 + safeBottom,
          paddingBottom: safeBottom,
        },
      }}
      screenListeners={({ route }) => ({
        tabPress: (e) => {
          // When any tab is pressed, navigate to its root screen
          e.preventDefault();
          const path = route.name === 'index' ? '/' : `/${route.name}`;
          router.replace(path as any);
        },
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hjem',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Medlemmer',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Begivenheder & Kampe',
          tabBarLabel: 'Aktivitet',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Beskeder',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message" color={color} size={size} />
          ),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'Om os',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="information" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

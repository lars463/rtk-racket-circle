import { Tabs, router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useMessages } from '@/contexts/MessagesContext';

export default function TabLayout() {
  const theme = useTheme();
  const { getUnreadCount } = useMessages();
  const unread = getUnreadCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
        tabBarLabelStyle: { fontSize: 10 },
        // Lift the tab bar a bit so labels don't sit flush with the iPhone
        // home indicator strip. paddingBottom expands the white tab bar
        // area downward; height makes total tab bar taller so icons +
        // labels stay in their natural position above the padding.
        tabBarStyle: {
          paddingBottom: 18,
          height: 68,
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
          title: 'Kampe & Begivenheder',
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

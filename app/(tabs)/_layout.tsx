import { Tabs, router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { ImageBackground, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessages } from '@/contexts/MessagesContext';

const clubHero = require('@/assets/images/club-hero.jpg');

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { getUnreadCount } = useMessages();
  const unread = getUnreadCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
        tabBarLabelStyle: { fontSize: 10 },
        // Fill the safe-area-inset-bottom strip below the tab bar with the
        // hero image so it doesn't appear as empty white space on iOS PWA.
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {insets.bottom > 0 && (
              <ImageBackground
                source={clubHero}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: insets.bottom,
                }}
                resizeMode="cover"
              />
            )}
          </View>
        ),
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

import { Tabs, router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme, Text as PaperText } from 'react-native-paper';
import { ImageBackground, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessages } from '@/contexts/MessagesContext';

const clubHero = require('@/assets/images/club-hero.jpg');

// Extra height added below the tab-bar icons so the bottom banner image has
// room to display the "Erhvervsnetværk · Roskilde Tennis Klub" caption.
const BOTTOM_BANNER_EXTRA = 28;

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { getUnreadCount } = useMessages();
  const unread = getUnreadCount();

  // Total height of the bottom banner area (caption text + iOS home-indicator
  // safe area). The tab bar's own height is extended by the same amount so
  // the icons + labels stay in the white area at the top.
  const bannerHeight = insets.bottom + BOTTOM_BANNER_EXTRA;
  // Tab content area (icons + labels). Generous so labels never clip.
  const TAB_CONTENT_HEIGHT = 60;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 0 },
        // Total tab bar height = icons/labels + caption banner area.
        // The image background (rendered separately) fills the bottom
        // bannerHeight px; icons sit in the top TAB_CONTENT_HEIGHT px.
        tabBarStyle: {
          height: TAB_CONTENT_HEIGHT + bannerHeight,
          paddingTop: 6,
          paddingBottom: bannerHeight,
        },
        // Render the tab bar background as: white behind icons (top), then
        // the club-hero image (bottom) with a centered caption — extending
        // all the way down to the home-indicator strip.
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <ImageBackground
              source={clubHero}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: bannerHeight,
                justifyContent: 'flex-start',
              }}
              resizeMode="cover"
            >
              {/* Subtle dark overlay for caption legibility */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                }}
              />
              <PaperText
                style={{
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: 6,
                  paddingHorizontal: 8,
                }}
                numberOfLines={1}
              >
                Erhvervsnetværk · Roskilde Tennis Klub
              </PaperText>
            </ImageBackground>
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

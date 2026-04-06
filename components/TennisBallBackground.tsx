import { Platform, StyleSheet, View, Image } from 'react-native';

const TENNIS_BALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><circle cx="300" cy="300" r="255" fill="none" stroke="#2E7D32" stroke-width="3" opacity="0.10"/><path d="M 105 128 Q 300 300, 105 472" fill="none" stroke="#2E7D32" stroke-width="3" opacity="0.10"/><path d="M 495 128 Q 300 300, 495 472" fill="none" stroke="#2E7D32" stroke-width="3" opacity="0.10"/></svg>`;
const TENNIS_BALL_URI = `data:image/svg+xml,${encodeURIComponent(TENNIS_BALL_SVG)}`;

/**
 * Renders a subtle centered tennis ball SVG watermark behind screen content.
 * Only visible on web — renders nothing on native.
 */
export function TennisBallBackground() {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={{ uri: TENNIS_BALL_URI }}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 600,
    height: 600,
    opacity: 1,
  },
});

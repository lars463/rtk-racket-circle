import { useState } from 'react';
import { StyleSheet, Modal, Pressable, Image, useWindowDimensions } from 'react-native';
import { IconButton } from 'react-native-paper';

interface ImageLightboxProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export function ImageLightbox({ visible, imageUrl, onClose }: ImageLightboxProps) {
  const { width, height } = useWindowDimensions();
  const imageSize = Math.min(width, height) * 0.85;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          <IconButton
            icon="close"
            size={28}
            iconColor="#fff"
            style={styles.closeBtn}
            onPress={onClose}
          />
          <Image
            source={{ uri: imageUrl }}
            style={{ width: imageSize, height: imageSize, borderRadius: 12 }}
            resizeMode="contain"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useImageLightbox() {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const openLightbox = (url: string) => setLightboxImage(url);
  const closeLightbox = () => setLightboxImage(null);

  return { lightboxImage, openLightbox, closeLightbox };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: -50,
    right: -10,
    zIndex: 10,
  },
});

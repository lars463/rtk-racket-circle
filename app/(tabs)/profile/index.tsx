import { StyleSheet, ScrollView, View, Image, Pressable } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { ImageLightbox, useImageLightbox } from '@/components/ui/ImageLightbox';
import { getFullName } from '@/utils/formatters';
import { playLevelLabels, padelLevelLabels } from '@/data/categories';
import { colors } from '@/theme';

export default function ProfileScreen() {
  const { currentUser, logout } = useAuth();
  const { lightboxImage, openLightbox, closeLightbox } = useImageLightbox();

  if (!currentUser) {
    return (
      <View style={styles.centered}>
        <Text>Indlæser...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ImageLightbox
        visible={!!lightboxImage}
        imageUrl={lightboxImage || ''}
        onClose={closeLightbox}
      />
      <View style={styles.header}>
        {currentUser.avatarUrl ? (
          <Pressable onPress={() => openLightbox(currentUser.avatarUrl!)}>
            <MemberAvatar
              firstName={currentUser.firstName}
              lastName={currentUser.lastName}
              avatarUrl={currentUser.avatarUrl}
              size={90}
            />
          </Pressable>
        ) : (
          <MemberAvatar
            firstName={currentUser.firstName}
            lastName={currentUser.lastName}
            avatarUrl={currentUser.avatarUrl}
            size={90}
          />
        )}
        <Text variant="headlineSmall" style={styles.name}>
          {getFullName(currentUser.firstName, currentUser.lastName)}
        </Text>
        <Text variant="titleMedium" style={styles.title}>
          {currentUser.jobTitle}
        </Text>
        <Text variant="bodyLarge" style={styles.company}>
          {currentUser.companyName}
        </Text>
        <Button
          mode="outlined"
          icon="pencil"
          onPress={() => router.push('/profile/edit')}
          style={styles.editBtn}>
          Rediger profil
        </Button>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Om</Text>
          <Text variant="bodyMedium" style={styles.bio}>{currentUser.bio}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Erhvervsområde</Text>
          <Text variant="bodyMedium" style={styles.bio}>{currentUser.businessDescription}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Kontakt</Text>
          <InfoRow label="E-mail" value={currentUser.email} />
          <InfoRow label="Telefon" value={currentUser.phone || 'Ikke angivet'} />
          {currentUser.website && <InfoRow label="Hjemmeside" value={currentUser.website} />}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Info</Text>
          <InfoRow label="Køn" value={currentUser.gender === 'male' ? 'Mand' : currentUser.gender === 'female' ? 'Kvinde' : 'Ikke angivet'} />
          <InfoRow label="Tennisniveau" value={currentUser.playLevel != null ? playLevelLabels[currentUser.playLevel] : 'Ikke angivet'} />
          <InfoRow label="Padelniveau" value={currentUser.padelLevel != null ? padelLevelLabels[currentUser.padelLevel] : 'Ikke angivet'} />
          <InfoRow label="Familie i RTK" value={currentUser.familyInRTK || 'Ikke angivet'} />
          {currentUser.familyPhotos && currentUser.familyPhotos.length > 0 && (
            <View style={styles.familyPhotosRow}>
              {currentUser.familyPhotos.map((photo, idx) => (
                <Pressable key={idx} onPress={() => openLightbox(photo)}>
                  <Image source={{ uri: photo }} style={styles.familyPhoto} />
                </Pressable>
              ))}
            </View>
          )}
          <InfoRow label="Relevante kompetencer for RTK" value={currentUser.rtkCompetencies || 'Ikke angivet'} />
          <InfoRow label="Spilinteresser" value={
            [
              currentUser.matchInterests?.padelDouble && 'Padel double (samme køn)',
              currentUser.matchInterests?.padelMix && 'Padel mixdouble',
              currentUser.matchInterests?.tennisSingle && 'Tennis single (samme køn)',
              currentUser.matchInterests?.tennisSingleMix && 'Tennis single (mix)',
              currentUser.matchInterests?.tennisDouble && 'Tennis double (samme køn)',
              currentUser.matchInterests?.tennisMix && 'Tennis mixdouble',
            ].filter(Boolean).join(', ') || 'Ikke angivet'
          } />
        </Card.Content>
      </Card>

      {currentUser.isAdmin && (
        <Button
          mode="contained"
          icon="account-plus"
          onPress={() => router.push('/directory/add-member')}
          style={styles.addMemberBtn}>
          Opret nyt medlem
        </Button>
      )}

      <Button
        mode="outlined"
        icon="lock-reset"
        onPress={() => router.push('/profile/change-password')}
        style={styles.changePwdBtn}>
        Skift adgangskode
      </Button>

      <Button
        mode="outlined"
        icon="logout"
        onPress={logout}
        textColor="#D32F2F"
        style={styles.logoutBtn}>
        Log ud
      </Button>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text variant="bodySmall" style={infoStyles.label}>{label}</Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  label: { color: colors.onSurfaceVariant, marginBottom: 2 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 30,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  name: {
    fontWeight: '700',
    marginTop: 14,
  },
  title: {
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  company: {
    color: colors.primary,
    marginTop: 2,
  },
  editBtn: {
    marginTop: 14,
    borderRadius: 12,
  },
  addMemberBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
  },
  changePwdBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    borderColor: '#D32F2F',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 10,
  },
  bio: {
    color: colors.onSurface,
    lineHeight: 22,
  },
  familyPhotosRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  familyPhoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
});

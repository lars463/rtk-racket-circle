import { StyleSheet, ScrollView, View, Alert, Platform, Image, Pressable } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useMembers } from '@/contexts/MembersContext';
import { useMessages } from '@/contexts/MessagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { ImageLightbox, useImageLightbox } from '@/components/ui/ImageLightbox';
import { getFullName, formatDate } from '@/utils/formatters';
import { playLevelLabels, padelLevelLabels } from '@/data/categories';
import { generateTempPassword } from '@/data/credentials';
import { colors } from '@/theme';

export default function MemberProfileScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { getMemberById, updateMember, deleteMember } = useMembers();
  const { startConversation } = useMessages();
  const { currentUser, resetPassword } = useAuth();
  const member = getMemberById(memberId);
  const isAdmin = currentUser?.isAdmin === true;
  const { lightboxImage, openLightbox, closeLightbox } = useImageLightbox();

  if (!member) {
    return (
      <View style={styles.centered}>
        <Text>Medlem ikke fundet</Text>
      </View>
    );
  }

  const isOwnProfile = member.id === currentUser?.id;

  const handleMessage = async () => {
    try {
      const conversationId = await startConversation([member.id]);
      if (conversationId) {
        router.push(`/messages/${conversationId}`);
      }
    } catch (e) {
      console.error('Failed to start conversation:', e);
    }
  };

  const handleToggleActive = () => {
    const isActive = member.isActive !== false;
    const action = isActive ? 'deaktivere' : 'aktivere';
    const doToggle = () => {
      updateMember(member.id, { isActive: !isActive });
    };
    if (Platform.OS === 'web') {
      if (confirm(`Er du sikker på at du vil ${action} dette medlem?`)) {
        doToggle();
      }
    } else {
      Alert.alert(`${isActive ? 'Deaktiver' : 'Aktiver'} medlem`, `Er du sikker på at du vil ${action} dette medlem?`, [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Ja', onPress: doToggle },
      ]);
    }
  };

  const handleResetPassword = () => {
    const newPassword = generateTempPassword();
    const doReset = async () => {
      const success = await resetPassword(member.id, newPassword);
      const msg = success
        ? `Adgangskoden for ${member.firstName} er nulstillet til: ${newPassword}`
        : 'Kunne ikke nulstille adgangskode';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(success ? 'Succes' : 'Fejl', msg);
      }
    };
    if (Platform.OS === 'web') {
      if (confirm(`Nulstil adgangskode for ${member.firstName} ${member.lastName}?`)) {
        doReset();
      }
    } else {
      Alert.alert('Nulstil adgangskode', `Nulstil adgangskode for ${member.firstName} ${member.lastName}?`, [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Nulstil', onPress: doReset },
      ]);
    }
  };

  const handleDeleteMember = () => {
    const doDelete = async () => {
      await deleteMember(member.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (confirm('Er du sikker på at du vil slette dette medlem permanent?')) {
        doDelete();
      }
    } else {
      Alert.alert('Slet medlem', 'Er du sikker på at du vil slette dette medlem permanent?', [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Slet', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ImageLightbox
        visible={!!lightboxImage}
        imageUrl={lightboxImage || ''}
        onClose={closeLightbox}
      />
      <View style={styles.header}>
        {member.avatarUrl ? (
          <Pressable onPress={() => openLightbox(member.avatarUrl!)}>
            <MemberAvatar
              firstName={member.firstName}
              lastName={member.lastName}
              avatarUrl={member.avatarUrl}
              size={90}
            />
          </Pressable>
        ) : (
          <MemberAvatar
            firstName={member.firstName}
            lastName={member.lastName}
            avatarUrl={member.avatarUrl}
            size={90}
          />
        )}
        <Text variant="headlineSmall" style={styles.name}>
          {getFullName(member.firstName, member.lastName)}
        </Text>
        <Text variant="titleMedium" style={styles.title}>
          {member.jobTitle}
        </Text>
        <Text variant="bodyLarge" style={styles.company}>
          {member.companyName}
        </Text>
      </View>

      {!isOwnProfile && (
        <View style={styles.actions}>
          <Button mode="contained" icon="message" onPress={handleMessage} style={styles.msgBtn}>
            Send besked
          </Button>
        </View>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Om</Text>
          <Text variant="bodyMedium" style={styles.bio}>{member.bio}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Erhvervsområde</Text>
          <Text variant="bodyMedium" style={styles.bio}>{member.businessDescription}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Kontakt</Text>
          <InfoRow label="E-mail" value={member.email} />
          <InfoRow label="Telefon" value={member.phone || 'Ikke angivet'} />
          {member.website && <InfoRow label="Hjemmeside" value={member.website} />}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Info</Text>
          {member.gender && <InfoRow label="K��n" value={member.gender === 'male' ? 'Mand' : 'Kvinde'} />}
          <InfoRow label="Tennisniveau" value={member.playLevel != null ? playLevelLabels[member.playLevel] : 'Ikke angivet'} />
          <InfoRow label="Padelniveau" value={member.padelLevel != null ? padelLevelLabels[member.padelLevel] : 'Ikke angivet'} />
          {member.familyInRTK && <InfoRow label="Familie i RTK" value={member.familyInRTK} />}
          {member.familyPhotos && member.familyPhotos.length > 0 && (
            <View style={styles.familyPhotosRow}>
              {member.familyPhotos.map((photo, idx) => (
                <Pressable key={idx} onPress={() => openLightbox(photo)}>
                  <Image source={{ uri: photo }} style={styles.familyPhoto} />
                </Pressable>
              ))}
            </View>
          )}
          {member.rtkCompetencies && <InfoRow label="Relevante kompetencer for RTK" value={member.rtkCompetencies} />}
          {(member.matchInterests?.padelDouble || member.matchInterests?.padelMix || member.matchInterests?.tennisDouble || member.matchInterests?.tennisMix || member.matchInterests?.tennisSingle || member.matchInterests?.tennisSingleMix) && (
            <InfoRow label="Spilinteresser" value={
              [
                member.matchInterests.padelDouble && 'Padel double (samme køn)',
                member.matchInterests.padelMix && 'Padel mixdouble',
                member.matchInterests.tennisSingle && 'Tennis single (samme køn)',
                member.matchInterests.tennisSingleMix && 'Tennis single (mix)',
                member.matchInterests.tennisDouble && 'Tennis double (samme køn)',
                member.matchInterests.tennisMix && 'Tennis mixdouble',
              ].filter(Boolean).join(', ')
            } />
          )}
        </Card.Content>
      </Card>

      {isAdmin && !isOwnProfile && (
        <View style={styles.adminSection}>
          <Text variant="titleMedium" style={styles.adminTitle}>Administration</Text>
          <Button
            mode="outlined"
            icon="lock-reset"
            style={styles.adminBtn}
            onPress={handleResetPassword}>
            Nulstil adgangskode
          </Button>
          <Button
            mode="outlined"
            icon={member.isActive !== false ? 'account-off' : 'account-check'}
            style={styles.adminBtn}
            onPress={handleToggleActive}>
            {member.isActive !== false ? 'Deaktiver medlem' : 'Aktiver medlem'}
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            textColor="#D32F2F"
            style={styles.deleteMemberBtn}
            onPress={handleDeleteMember}>
            Slet medlem
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text variant="bodySmall" style={infoStyles.label}>{label}</Text>
      <Text variant="bodyMedium" style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  label: { color: colors.onSurfaceVariant, marginBottom: 2 },
  value: { color: colors.onSurface },
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
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  msgBtn: {
    borderRadius: 12,
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
  adminSection: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
  },
  adminTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  adminBtn: {
    borderRadius: 12,
    marginBottom: 10,
  },
  deleteMemberBtn: {
    borderColor: '#D32F2F',
    borderRadius: 12,
  },
});

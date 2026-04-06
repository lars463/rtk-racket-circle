import { useState } from 'react';
import { StyleSheet, ScrollView, View, Pressable, Modal, Image, Platform } from 'react-native';
import { TextInput, Button, Text, Icon, Checkbox } from 'react-native-paper';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/contexts/AuthContext';
import { MemberAvatar } from '@/components/members/MemberAvatar';
import { PlayLevel, PadelLevel, Gender } from '@/types';
import { playLevelLabels, padelLevelLabels } from '@/data/categories';
import { tennisQuickguide, padelQuickguide } from '@/data/quickguides';
import { colors } from '@/theme';

const playLevels: PlayLevel[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const padelLevels: PadelLevel[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function EditProfileScreen() {
  const { currentUser, updateProfile } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl ?? null);
  const [firstName, setFirstName] = useState(currentUser?.firstName ?? '');
  const [lastName, setLastName] = useState(currentUser?.lastName ?? '');
  const [gender, setGender] = useState<Gender | null>(currentUser?.gender ?? null);
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle ?? '');
  const [companyName, setCompanyName] = useState(currentUser?.companyName ?? '');
  const [businessDescription, setBusinessDescription] = useState(currentUser?.businessDescription ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [website, setWebsite] = useState(currentUser?.website ?? '');
  const [playLevel, setPlayLevel] = useState<PlayLevel | null>(currentUser?.playLevel ?? null);
  const [padelLevel, setPadelLevel] = useState<PadelLevel | null>(currentUser?.padelLevel ?? null);
  const [familyInRTK, setFamilyInRTK] = useState(currentUser?.familyInRTK ?? '');
  const [familyPhotos, setFamilyPhotos] = useState<string[]>(currentUser?.familyPhotos ?? []);
  const [rtkCompetencies, setRtkCompetencies] = useState(currentUser?.rtkCompetencies ?? '');
  const [matchInterests, setMatchInterests] = useState(currentUser?.matchInterests ?? {
    padelDouble: false, padelMix: false, tennisDouble: false, tennisMix: false, tennisSingle: false, tennisSingleMix: false,
  });
  const [saving, setSaving] = useState(false);
  const [guideVisible, setGuideVisible] = useState<'tennis' | 'padel' | null>(null);
  const [notifNewMessage, setNotifNewMessage] = useState(currentUser?.notificationNewMessage !== false);
  const [notifNewEvent, setNotifNewEvent] = useState(currentUser?.notificationNewEvent !== false);
  const [notifNewMatch, setNotifNewMatch] = useState(currentUser?.notificationNewMatch !== false);
  const [notifEventUpdate, setNotifEventUpdate] = useState(currentUser?.notificationEventUpdate !== false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType || 'image/jpeg';
        setAvatarUrl(`data:${mimeType};base64,${asset.base64}`);
      } else if (asset.uri) {
        setAvatarUrl(asset.uri);
      }
    }
  };

  const removeImage = () => {
    setAvatarUrl(null);
  };

  const handleSave = async () => {
    if (!currentUser || saving) return;
    setSaving(true);
    try {
      const updates = {
      avatarUrl,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      bio: bio.trim(),
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      businessDescription: businessDescription.trim(),
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim() || null,
      playLevel,
      padelLevel,
      familyInRTK: familyInRTK.trim() || null,
      familyPhotos,
      rtkCompetencies: rtkCompetencies.trim() || null,
      matchInterests,
      notificationNewMessage: notifNewMessage,
      notificationNewEvent: notifNewEvent,
      notificationNewMatch: notifNewMatch,
      notificationEventUpdate: notifEventUpdate,
    };

      await updateProfile(updates);
      router.back();
    } catch (e: any) {
      alert(e?.message || 'Kunne ikke gemme profil');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar Upload Section */}
      <View style={styles.avatarSection}>
        <Pressable onPress={pickImage} style={styles.avatarTouchable}>
          <MemberAvatar
            firstName={firstName || currentUser.firstName}
            lastName={lastName || currentUser.lastName}
            avatarUrl={avatarUrl}
            size={100}
          />
          <View style={styles.cameraIconBadge}>
            <Icon source="camera" size={18} color="#fff" />
          </View>
        </Pressable>
        <Text variant="bodySmall" style={styles.avatarHint}>
          Tryk for at vælge billede
        </Text>
        {avatarUrl && (
          <Pressable onPress={removeImage} style={styles.removeBtn}>
            <Text variant="bodySmall" style={styles.removeBtnText}>
              Fjern billede
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <TextInput
          label="Fornavn"
          value={firstName}
          onChangeText={setFirstName}
          mode="outlined"
          style={[styles.input, styles.half]}
        />
        <TextInput
          label="Efternavn"
          value={lastName}
          onChangeText={setLastName}
          mode="outlined"
          style={[styles.input, styles.half]}
        />
      </View>
      <Text variant="labelLarge" style={styles.label}>Køn</Text>
      <View style={styles.genderRow}>
        <Pressable
          style={[styles.genderOption, gender === 'male' && styles.genderOptionSelected]}
          onPress={() => setGender('male')}>
          <Text variant="bodyMedium" style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>Mand</Text>
        </Pressable>
        <Pressable
          style={[styles.genderOption, gender === 'female' && styles.genderOptionSelected]}
          onPress={() => setGender('female')}>
          <Text variant="bodyMedium" style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>Kvinde</Text>
        </Pressable>
      </View>

      <TextInput
        label="Jobtitel"
        value={jobTitle}
        onChangeText={setJobTitle}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Virksomhed"
        value={companyName}
        onChangeText={setCompanyName}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Om mig"
        value={bio}
        onChangeText={setBio}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />
      <TextInput
        label="Erhvervsbeskrivelse"
        value={businessDescription}
        onChangeText={setBusinessDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />
      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={false}
        style={[styles.input, { opacity: 0.6 }]}
      />
      <TextInput
        label="Telefon"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        keyboardType="phone-pad"
        style={styles.input}
      />
      <TextInput
        label="Hjemmeside"
        value={website}
        onChangeText={setWebsite}
        mode="outlined"
        keyboardType="url"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        label="Familie i RTK"
        value={familyInRTK}
        onChangeText={setFamilyInRTK}
        mode="outlined"
        placeholder="F.eks. Hustru: Anne (motionist), Søn: Oscar (U12)"
        multiline
        numberOfLines={2}
        style={styles.input}
      />
      <View style={styles.familyPhotosSection}>
        <View style={styles.familyPhotosRow}>
          {familyPhotos.map((photo, idx) => (
            <View key={idx} style={styles.familyPhotoWrapper}>
              <Image source={{ uri: photo }} style={styles.familyPhoto} />
              <Pressable
                style={styles.familyPhotoRemove}
                onPress={() => setFamilyPhotos(prev => prev.filter((_, i) => i !== idx))}>
                <Icon source="close-circle" size={22} color="#D32F2F" />
              </Pressable>
            </View>
          ))}
          {familyPhotos.length < 3 && Platform.OS === 'web' && (
            <View style={styles.familyPhotoAdd}>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', cursor: 'pointer' } as any}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' } as any}
                  onChange={(e: any) => {
                    const file = e.target?.files?.[0];
                    if (!file) return;
                    const inputEl = e.target;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const src = ev.target?.result as string;
                      if (!src) return;
                      const img = new window.Image();
                      img.onload = () => {
                        try {
                          const canvas = document.createElement('canvas');
                          canvas.width = 600;
                          canvas.height = 600;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          const size = Math.min(img.width, img.height);
                          const sx = (img.width - size) / 2;
                          const sy = (img.height - size) / 2;
                          ctx.drawImage(img, sx, sy, size, size, 0, 0, 600, 600);
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                          setFamilyPhotos(prev => [...prev, dataUrl]);
                        } catch (err) {
                          // Canvas resize failed — use original (scaled by browser)
                          setFamilyPhotos(prev => [...prev, src]);
                        }
                        // Reset input after processing so same file can be selected again
                        inputEl.value = '';
                      };
                      img.onerror = () => {
                        // If Image() fails, use the raw data URL
                        setFamilyPhotos(prev => [...prev, src]);
                        inputEl.value = '';
                      };
                      img.src = src;
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <Icon source="camera-plus" size={28} color={colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>Tilføj foto</Text>
              </label>
            </View>
          )}
          {familyPhotos.length < 3 && Platform.OS !== 'web' && (
            <Pressable
              style={styles.familyPhotoAdd}
              onPress={async () => {
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                  });
                  if (result.canceled || !result.assets?.[0]) return;
                  const asset = result.assets[0];
                  const manipulated = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 600, height: 600 } }],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                  );
                  if (manipulated.base64) {
                    const dataUrl = `data:image/jpeg;base64,${manipulated.base64}`;
                    setFamilyPhotos(prev => [...prev, dataUrl]);
                  }
                } catch (e) {
                  console.error('Family photo pick error:', e);
                }
              }}>
              <Icon source="camera-plus" size={28} color={colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>Tilføj foto</Text>
            </Pressable>
          )}
        </View>
      </View>
      <TextInput
        label="Relevante kompetencer for RTK"
        value={rtkCompetencies}
        onChangeText={setRtkCompetencies}
        mode="outlined"
        placeholder="F.eks. Sponsoraftaler, Klubhus-renovering, PR & kommunikation"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <Text variant="labelLarge" style={styles.label}>Spilinteresser</Text>
      <View style={styles.checkboxGroup}>
        <Pressable style={styles.checkboxRow} onPress={() => setMatchInterests(p => ({ ...p, padelDouble: !p.padelDouble }))}>
          <Checkbox status={matchInterests.padelDouble ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Padel double (samme køn)</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setMatchInterests(p => ({ ...p, padelMix: !p.padelMix }))}>
          <Checkbox status={matchInterests.padelMix ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Padel mixdouble</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setMatchInterests(p => ({ ...p, tennisSingle: !p.tennisSingle }))}>
          <Checkbox status={matchInterests.tennisSingle ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Tennis single (samme køn)</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setMatchInterests(p => ({ ...p, tennisSingleMix: !p.tennisSingleMix }))}>
          <Checkbox status={matchInterests.tennisSingleMix ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Tennis single (mix)</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setMatchInterests(p => ({ ...p, tennisDouble: !p.tennisDouble }))}>
          <Checkbox status={matchInterests.tennisDouble ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Tennis double (samme køn)</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setMatchInterests(p => ({ ...p, tennisMix: !p.tennisMix }))}>
          <Checkbox status={matchInterests.tennisMix ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Tennis mixdouble</Text>
        </Pressable>
      </View>

      <View style={styles.labelRow}>
        <Text variant="labelLarge" style={styles.label}>Tennisniveau</Text>
        <Pressable onPress={() => setGuideVisible('tennis')}>
          <Text variant="bodySmall" style={styles.guideLink}>Tennis niveau quickguide</Text>
        </Pressable>
      </View>
      <View style={styles.padelGrid}>
        <Pressable
          style={[styles.padelOption, playLevel === null && styles.padelOptionSelected]}
          onPress={() => setPlayLevel(null)}>
          <Text
            variant="bodyMedium"
            style={[styles.padelText, playLevel === null && styles.padelTextSelected]}>
            Ingen
          </Text>
        </Pressable>
        {playLevels.map((level) => {
          const selected = playLevel === level;
          return (
            <Pressable
              key={level}
              style={[styles.padelOption, selected && styles.padelOptionSelected]}
              onPress={() => setPlayLevel(level)}>
              <Text
                variant="bodyMedium"
                style={[styles.padelText, selected && styles.padelTextSelected]}>
                {playLevelLabels[level]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.labelRow}>
        <Text variant="labelLarge" style={styles.label}>Padelniveau</Text>
        <Pressable onPress={() => setGuideVisible('padel')}>
          <Text variant="bodySmall" style={styles.guideLink}>Padel niveau quickguide</Text>
        </Pressable>
      </View>
      <View style={styles.padelGrid}>
        <Pressable
          style={[styles.padelOption, padelLevel === null && styles.padelOptionSelected]}
          onPress={() => setPadelLevel(null)}>
          <Text
            variant="bodyMedium"
            style={[styles.padelText, padelLevel === null && styles.padelTextSelected]}>
            Ingen
          </Text>
        </Pressable>
        {padelLevels.map((level) => {
          const selected = padelLevel === level;
          return (
            <Pressable
              key={level}
              style={[styles.padelOption, selected && styles.padelOptionSelected]}
              onPress={() => setPadelLevel(level)}>
              <Text
                variant="bodyMedium"
                style={[styles.padelText, selected && styles.padelTextSelected]}>
                {padelLevelLabels[level]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="labelLarge" style={styles.sectionLabel}>Email-notifikationer</Text>
      <View style={styles.checkboxGroup}>
        <Pressable style={styles.checkboxRow} onPress={() => setNotifNewEvent(!notifNewEvent)}>
          <Checkbox status={notifNewEvent ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Nye events</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setNotifNewMatch(!notifNewMatch)}>
          <Checkbox status={notifNewMatch ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Nye kampe</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setNotifEventUpdate(!notifEventUpdate)}>
          <Checkbox status={notifEventUpdate ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Aflysninger og ændringer</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setNotifNewMessage(!notifNewMessage)}>
          <Checkbox status={notifNewMessage ? 'checked' : 'unchecked'} color={colors.primary} />
          <Text variant="bodyLarge">Nye beskeder</Text>
        </Pressable>
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={saving}
        loading={saving}
        style={styles.saveBtn}
        contentStyle={styles.saveBtnContent}>
        Gem ændringer
      </Button>

    </ScrollView>

      <Modal
        visible={guideVisible !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGuideVisible(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {guideVisible === 'tennis' ? tennisQuickguide.title : padelQuickguide.title}
              </Text>
              <Pressable onPress={() => setGuideVisible(null)} style={styles.modalClose}>
                <Icon source="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
              {guideVisible === 'tennis' && tennisQuickguide.sections.map((s, i) => (
                <View key={i} style={styles.guideSection}>
                  <Text variant="titleSmall" style={styles.guideLevelTitle}>{s.level}</Text>
                  {s.bullets.map((b, j) => (
                    <Text key={j} variant="bodyMedium" style={styles.guideBullet}>• {b}</Text>
                  ))}
                </View>
              ))}
              {guideVisible === 'padel' && padelQuickguide.sections.map((s, i) => (
                <View key={i} style={styles.guideSection}>
                  <Text variant="titleSmall" style={styles.guideLevelTitle}>{s.level}</Text>
                  <Text variant="bodyMedium" style={styles.guideDescription}>{s.description}</Text>
                </View>
              ))}
            </ScrollView>
            <Button mode="contained" onPress={() => setGuideVisible(null)} style={styles.modalCloseBtn}>
              Luk
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  avatarTouchable: {
    position: 'relative',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: {
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  removeBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  removeBtnText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  genderOption: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '15',
  },
  genderText: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  genderTextSelected: {
    color: colors.secondary,
  },
  familyPhotosSection: {
    marginBottom: 14,
  },
  familyPhotosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  familyPhotoWrapper: {
    position: 'relative',
  },
  familyPhoto: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
  },
  familyPhotoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  familyPhotoAdd: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  label: {
    color: colors.onSurfaceVariant,
    marginBottom: 10,
  },
  sectionLabel: {
    color: colors.onSurfaceVariant,
    marginBottom: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 20,
  },
  checkboxGroup: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  padelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  padelOption: {
    minWidth: 52,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  padelOptionSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '15',
  },
  padelText: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  padelTextSelected: {
    color: colors.secondary,
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 12,
  },
  saveBtnContent: {
    paddingVertical: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guideLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontWeight: '700',
    flex: 1,
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  guideSection: {
    marginBottom: 18,
  },
  guideLevelTitle: {
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  guideBullet: {
    color: colors.onSurface,
    lineHeight: 22,
    marginBottom: 4,
    paddingLeft: 4,
  },
  guideDescription: {
    color: colors.onSurface,
    lineHeight: 22,
  },
  modalCloseBtn: {
    margin: 16,
    borderRadius: 12,
  },
});

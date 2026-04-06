import { useState } from 'react';
import { StyleSheet, View, Platform, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme';

export default function ChangePasswordScreen() {
  const { currentUser, changePassword } = useAuth();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const handleChange = async () => {
    setError('');

    if (!currentPwd.trim() || !newPwd.trim() || !confirmPwd.trim()) {
      setError('Udfyld venligst alle felter');
      return;
    }

    if (newPwd !== confirmPwd) {
      setError('De nye adgangskoder matcher ikke');
      return;
    }

    if (newPwd.length < 8) {
      setError('Adgangskoden skal være mindst 8 tegn');
      return;
    }

    setSaving(true);
    try {
      const result = await changePassword(currentPwd, newPwd);

      if (!result.success) {
        setError(result.error ?? 'Kunne ikke ændre adgangskode');
        return;
      }

      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');

      const msg = 'Din adgangskode er blevet ændret';
      if (Platform.OS === 'web') {
        alert(msg);
        router.back();
      } else {
        Alert.alert('Succes', msg, [{ text: 'OK', onPress: () => router.back() }]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.heading}>Skift adgangskode</Text>

        <TextInput
          label="Nuværende adgangskode"
          value={currentPwd}
          onChangeText={(t) => { setCurrentPwd(t); setError(''); }}
          mode="outlined"
          secureTextEntry={!showCurrent}
          left={<TextInput.Icon icon="lock-outline" />}
          right={<TextInput.Icon icon={showCurrent ? 'eye-off' : 'eye'} onPress={() => setShowCurrent(!showCurrent)} />}
          style={styles.input}
        />

        <TextInput
          label="Ny adgangskode"
          value={newPwd}
          onChangeText={(t) => { setNewPwd(t); setError(''); }}
          mode="outlined"
          secureTextEntry={!showNew}
          left={<TextInput.Icon icon="lock-plus" />}
          right={<TextInput.Icon icon={showNew ? 'eye-off' : 'eye'} onPress={() => setShowNew(!showNew)} />}
          style={styles.input}
        />

        <TextInput
          label="Bekræft ny adgangskode"
          value={confirmPwd}
          onChangeText={(t) => { setConfirmPwd(t); setError(''); }}
          mode="outlined"
          secureTextEntry={!showNew}
          left={<TextInput.Icon icon="lock-check" />}
          style={styles.input}
        />

        {error ? (
          <Text variant="bodySmall" style={styles.error}>{error}</Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleChange}
          disabled={!currentPwd || !newPwd || !confirmPwd || saving}
          loading={saving}
          style={styles.saveBtn}
          contentStyle={styles.saveBtnContent}>
          Gem ny adgangskode
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  heading: {
    fontWeight: '700',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 12,
  },
  saveBtnContent: {
    paddingVertical: 6,
  },
});

import { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function ResetPasswordScreen() {
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if user arrived here via a password recovery link
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        }
      } catch (e) {
        console.error('Session check error:', e);
      }
      setChecking(false);
    })();

    // Listen for PASSWORD_RECOVERY event (triggered when user clicks reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    setError('');

    if (!newPwd.trim() || newPwd.length < 8) {
      setError('Adgangskoden skal være mindst 8 tegn');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('Adgangskoderne matcher ikke');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPwd,
      });

      if (updateError) {
        console.error('Update password error:', updateError);
        setError('Kunne ikke opdatere adgangskode. Prøv igen.');
        setLoading(false);
        return;
      }

      const msg = 'Din adgangskode er ændret! Du kan nu logge ind.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Succes', msg);
      }

      // Sign out so user can log in with new password
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (e) {
      console.error('Reset password error:', e);
      setError('Der opstod en fejl. Prøv igen.');
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge">Verificerer...</Text>
      </View>
    );
  }

  if (!hasSession) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Icon source="alert-circle" size={48} color="#fff" />
            </View>
            <Text variant="headlineSmall" style={styles.title}>Ugyldigt link</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Dette nulstillingslink er ugyldigt eller udløbet. Anmod om et nyt link.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={() => router.replace('/forgot-password')}
            style={styles.btn}
            contentStyle={styles.btnContent}>
            Anmod om nyt link
          </Button>

          <Button
            mode="text"
            onPress={() => router.replace('/login')}
            textColor={colors.onSurfaceVariant}
            style={styles.backBtn}>
            Tilbage til login
          </Button>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon source="shield-key" size={48} color="#fff" />
          </View>
          <Text variant="headlineSmall" style={styles.title}>Ny adgangskode</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Indtast din nye adgangskode
          </Text>
        </View>

        <TextInput
          label="Ny adgangskode"
          value={newPwd}
          onChangeText={(t) => { setNewPwd(t); setError(''); }}
          mode="outlined"
          secureTextEntry={!showPwd}
          left={<TextInput.Icon icon="lock-plus" />}
          right={<TextInput.Icon icon={showPwd ? 'eye-off' : 'eye'} onPress={() => setShowPwd(!showPwd)} />}
          style={styles.input}
        />

        <TextInput
          label="Bekræft ny adgangskode"
          value={confirmPwd}
          onChangeText={(t) => { setConfirmPwd(t); setError(''); }}
          mode="outlined"
          secureTextEntry={!showPwd}
          left={<TextInput.Icon icon="lock-check" />}
          style={styles.input}
        />

        {error ? (
          <Text variant="bodySmall" style={styles.error}>{error}</Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleReset}
          loading={loading}
          disabled={loading || !newPwd || !confirmPwd}
          style={styles.btn}
          contentStyle={styles.btnContent}>
          Nulstil adgangskode
        </Button>

        <Button
          mode="text"
          onPress={() => router.replace('/login')}
          textColor={colors.onSurfaceVariant}
          style={styles.backBtn}>
          Tilbage til login
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  btn: {
    borderRadius: 12,
    marginTop: 8,
  },
  btnContent: {
    paddingVertical: 6,
  },
  backBtn: {
    marginTop: 12,
  },
});

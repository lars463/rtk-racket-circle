import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async () => {
    if (!email.trim()) {
      setError('Indtast din email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send password reset email via Supabase Auth
      // Supabase handles non-existent emails gracefully — we always show success
      // to avoid revealing whether an email exists
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: 'https://app.racketcircle.dk/',
        }
      );

      if (resetError) {
        console.error('Reset password error:', resetError);
        setError('Der opstod en fejl. Prøv igen.');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (e) {
      console.error('Forgot password error:', e);
      setError('Der opstod en fejl. Prøv igen.');
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Icon source="email-check" size={48} color="#fff" />
            </View>
            <Text variant="headlineSmall" style={styles.title}>Tjek din email</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Vi har sendt et link til nulstilling af din adgangskode til{'\n'}
              <Text style={{ fontWeight: '700' }}>{email.trim()}</Text>
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              Klik på linket i emailen for at vælge en ny adgangskode. Linket er gyldigt i 1 time.
            </Text>
          </View>

          <Button
            mode="text"
            onPress={() => { setSent(false); handleRequest(); }}
            style={styles.retryBtn}>
            Ikke modtaget? Send igen
          </Button>

          <Button
            mode="contained"
            onPress={() => router.replace('/login')}
            style={styles.btn}
            contentStyle={styles.btnContent}>
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
            <Icon source="lock-reset" size={48} color="#fff" />
          </View>
          <Text variant="headlineSmall" style={styles.title}>Glemt adgangskode?</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Indtast din email, så sender vi et link til nulstilling
          </Text>
        </View>

        <TextInput
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          left={<TextInput.Icon icon="email-outline" />}
          style={styles.input}
        />

        {error ? (
          <Text variant="bodySmall" style={styles.error}>{error}</Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleRequest}
          loading={loading}
          disabled={loading || !email.trim()}
          style={styles.btn}
          contentStyle={styles.btnContent}>
          Send nulstillingslink
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
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
  infoText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
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
  retryBtn: {
    marginTop: 12,
    marginBottom: 8,
  },
  backBtn: {
    marginTop: 12,
  },
});

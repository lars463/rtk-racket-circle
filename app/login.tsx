import { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { TextInput, Button, Text, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { TennisBallBackground } from '@/components/TennisBallBackground';
import { colors } from '@/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Udfyld venligst begge felter');
      return;
    }

    setError('');
    setLoading(true);

    const success = await login(email, password);

    if (!success) {
      setError('Forkert email eller adgangskode');
      setLoading(false);
    }
    // If success, AuthContext sets currentUser → root layout redirects to tabs
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TennisBallBackground />
      <View style={styles.content}>
        {/* Branding */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Icon source="tennis" size={48} color="#fff" />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            RTK Racket Circle
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Erhvervsnetværk · Roskilde Tennis Klub
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
          />
          <TextInput
            label="Adgangskode"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          {error ? (
            <Text variant="bodySmall" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text variant="bodySmall" style={styles.forgotLink}>
              Glemt adgangskode?
            </Text>
          </Pressable>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginBtn}
            contentStyle={styles.loginBtnContent}>
            Log ind
          </Button>
        </View>

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
    marginBottom: 40,
  },
  logoCircle: {
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
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  form: {
    gap: 4,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 4,
    textDecorationLine: 'underline',
  },
  loginBtn: {
    marginTop: 8,
    borderRadius: 12,
  },
  loginBtnContent: {
    paddingVertical: 6,
  },
});

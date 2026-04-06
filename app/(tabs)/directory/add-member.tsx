import { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { TextInput, Button, Text, Card, Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { useMembers } from '@/contexts/MembersContext';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme';
import { generateTempPassword } from '@/data/credentials';
import { supabase } from '@/lib/supabase';

export default function AddMemberScreen() {
  const { refreshMembers } = useMembers();
  const { currentUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => generateTempPassword());
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const [savedPassword, setSavedPassword] = useState('');
  const [savedName, setSavedName] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser?.isAdmin) return null;

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) return;
    if (!isValidEmail(email.trim())) {
      setError('Ugyldig email-adresse');
      return;
    }
    if (saving) return;
    setSaving(true);
    setError('');

    try {
      // Use create_member RPC which creates Supabase Auth user + profile in one call
      const { data, error: rpcError } = await supabase.rpc('create_member', {
        user_email: email.trim().toLowerCase(),
        user_password: password.trim(),
        user_first_name: firstName.trim(),
        user_last_name: lastName.trim(),
      });

      if (rpcError) {
        console.error('Create member RPC error:', rpcError);
        if (rpcError.message?.includes('already registered') || rpcError.message?.includes('duplicate')) {
          setError('Denne email er allerede registreret');
        } else {
          setError('Kunne ikke oprette medlem. Prøv igen.');
        }
        setSaving(false);
        return;
      }

      // Refresh members list to include the new member
      await refreshMembers();

      // Show confirmation with login details
      setSavedName(`${firstName.trim()} ${lastName.trim()}`);
      setSavedEmail(email.trim().toLowerCase());
      setSavedPassword(password.trim());
      setDone(true);
    } catch (e) {
      console.error('Create member error:', e);
      setError('Kunne ikke oprette medlem. Prøv igen.');
    }
    setSaving(false);
  };

  if (done) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.successHeader}>
          <Icon source="check-circle" size={64} color={colors.primary} />
          <Text variant="headlineSmall" style={styles.successTitle}>Medlem oprettet!</Text>
        </View>

        <Card style={styles.detailsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.detailsTitle}>Login-oplysninger</Text>
            <Text variant="bodySmall" style={styles.detailsLabel}>Navn</Text>
            <Text variant="bodyLarge" style={styles.detailsValue}>{savedName}</Text>
            <Text variant="bodySmall" style={styles.detailsLabel}>Email</Text>
            <Text variant="bodyLarge" style={styles.detailsValue}>{savedEmail}</Text>
            <Text variant="bodySmall" style={styles.detailsLabel}>Adgangskode</Text>
            <Text variant="bodyLarge" style={styles.detailsValue}>{savedPassword}</Text>
          </Card.Content>
        </Card>

        {!emailSent ? (
          <Button
            mode="contained"
            icon="email-fast"
            loading={sendingEmail}
            disabled={sendingEmail}
            onPress={async () => {
              setSendingEmail(true);
              try {
                const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
                  <h2 style="color:#2E7D32;">RTK Racket Circle</h2>
                  <p>Hej ${savedName},</p>
                  <p>Velkommen til <strong>RTK Racket Circle</strong> - erhvervsnetværket i Roskilde Tennis Klub!</p>
                  <p>Du kan nu logge ind i vores app med følgende oplysninger:</p>
                  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
                    <p style="margin:0 0 8px;"><strong>App:</strong> <a href="https://app.racketcircle.dk/">app.racketcircle.dk</a></p>
                    <p style="margin:0 0 8px;"><strong>Email:</strong> ${savedEmail}</p>
                    <p style="margin:0;"><strong>Adgangskode:</strong> ${savedPassword}</p>
                  </div>
                  <p>Vi anbefaler at du ændrer din adgangskode efter første login under Profil → Skift adgangskode.</p>
                  <p>Udfyld også gerne din profil med spilleniveau, præferencer og kontaktinfo, så vi kan matche dig med de rigtige kampe og events.</p>
                  <p>Vi glæder os til at se dig på banen!</p>
                  <p>Venlig hilsen,<br/><strong>RTK Racket Circle</strong></p>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px;" />
                  <p style="font-size:12px;color:#999;">RTK Racket Circle - Erhvervsnetværk i Roskilde Tennis Klub</p>
                </div>`;
                const { error } = await supabase.rpc('send_email_via_resend', {
                  recipient: savedEmail,
                  email_subject: 'Velkommen til RTK Racket Circle',
                  html_body: htmlBody,
                });
                if (error) {
                  console.error('Email RPC error:', error);
                } else {
                  setEmailSent(true);
                }
              } catch (e) {
                console.error('Email send error:', e);
              }
              setSendingEmail(false);
            }}
            style={styles.actionBtn}>
            Send velkomstmail
          </Button>
        ) : (
          <View style={styles.emailSentRow}>
            <Icon source="check-circle" size={20} color={colors.primary} />
            <Text variant="bodyMedium" style={styles.emailSentText}>
              Velkomstmail sendt til {savedEmail}
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          icon="account-plus"
          onPress={() => {
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword(generateTempPassword());
            setDone(false);
            setEmailSent(false);
            setError('');
          }}
          style={styles.actionBtn}>
          Opret endnu et medlem
        </Button>

        <Button
          mode="outlined"
          icon="arrow-left"
          onPress={() => router.back()}
          style={styles.actionBtn}>
          Tilbage
        </Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.heading}>Opret nyt medlem</Text>

      <View style={styles.row}>
        <TextInput
          label="Fornavn *"
          value={firstName}
          onChangeText={(t) => { setFirstName(t); setError(''); }}
          mode="outlined"
          style={styles.halfInput}
        />
        <TextInput
          label="Efternavn *"
          value={lastName}
          onChangeText={(t) => { setLastName(t); setError(''); }}
          mode="outlined"
          style={styles.halfInput}
        />
      </View>

      <TextInput
        label="E-mail *"
        value={email}
        onChangeText={(t) => { setEmail(t); setError(''); }}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        left={<TextInput.Icon icon="email-outline" />}
        style={styles.input}
      />

      <TextInput
        label="Adgangskode *"
        value={password}
        onChangeText={(t) => { setPassword(t); setError(''); }}
        mode="outlined"
        secureTextEntry={!showPassword}
        left={<TextInput.Icon icon="lock-outline" />}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        style={styles.input}
      />

      <Text variant="bodySmall" style={styles.hint}>
        En tilfældig adgangskode er genereret. Medlemmet bør ændre den efter første login.
      </Text>

      {error ? (
        <Text variant="bodySmall" style={styles.error}>{error}</Text>
      ) : null}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()}
        style={styles.saveBtn}
        contentStyle={styles.saveBtnContent}>
        Opret medlem
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontWeight: '700',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  hint: {
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 10,
    borderRadius: 12,
  },
  saveBtnContent: {
    paddingVertical: 6,
  },
  // Success screen
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  successTitle: {
    fontWeight: '700',
    marginTop: 12,
    color: colors.primary,
  },
  detailsCard: {
    marginBottom: 20,
  },
  detailsTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  detailsLabel: {
    color: colors.onSurfaceVariant,
    marginTop: 10,
    marginBottom: 2,
  },
  detailsValue: {
    fontWeight: '600',
  },
  actionBtn: {
    borderRadius: 12,
    marginBottom: 10,
  },
  emailSentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 10,
  },
  emailSentText: {
    color: colors.primary,
    fontWeight: '600',
  },
});

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Screen, styles } from '../../components/ui';
import { ErrorState } from '../../components/RemoteContent';
import { useAuth } from '../../lib/auth/AuthProvider';

export default function SignInScreen() {
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foundation = status === 'foundation';
  async function submit() {
    setBusy(true); setError(null);
    try { await signIn(email.trim(), password); }
    catch { setError('Unable to sign in. Check your details and connection.'); }
    finally { setPassword(''); setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <Screen title="Welcome to Atlas" subtitle="One account for your journey.">
      {foundation ? <Body>Sign in will be available in a future preview.</Body> : null}
      <Body>Email</Body>
      <TextInput accessibilityLabel="Email" style={styles.input} value={email} onChangeText={setEmail}
        editable={!foundation && !busy} autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Body>Password</Body>
      <TextInput accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword}
        editable={!foundation && !busy} secureTextEntry autoCapitalize="none" autoCorrect={false}
        autoComplete="current-password" textContentType="password" />
      {error ? <ErrorState message={error} /> : null}
      <Button label={busy ? 'Signing in…' : 'Sign in'} disabled={foundation || busy || !email.trim() || !password}
        onPress={() => { void submit(); }} />
      {foundation ? <Button label="Return to preview" onPress={() => router.replace('/')} /> : null}
    </Screen>
  </KeyboardAvoidingView>;
}

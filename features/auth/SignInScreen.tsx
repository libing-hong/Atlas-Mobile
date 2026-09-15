import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Screen, TextButton, styles } from '../../components/ui';
import { ErrorState } from '../../components/RemoteContent';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useI18n } from '../../lib/i18n/I18nProvider';

export default function SignInScreen() {
  const { status, signIn, signUp } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foundation = status === 'foundation';
  async function submit() {
    setBusy(true); setError(null);
    if (mode === 'sign-up' && password.length < 8) { setError(t('passwordTooShort')); setBusy(false); return; }
    if (mode === 'sign-up' && password !== confirmPassword) { setError(t('passwordsMismatch')); setBusy(false); return; }
    try {
      if (mode === 'sign-in') await signIn(email.trim(), password);
      else {
        const result = await signUp(email.trim(), password);
        if (result === 'confirmation-required') {
          setError(null); setSuccess(t('confirmationSent')); setMode('sign-in');
        }
      }
    }
    catch { setError(t('authError')); }
    finally { setPassword(''); setBusy(false); }
  }
  const [success, setSuccess] = useState<string | null>(null);
  function switchMode(next: 'sign-in' | 'sign-up') {
    setMode(next); setError(null); setSuccess(null); setPassword(''); setConfirmPassword('');
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <Screen title={t('welcome')} subtitle={t('welcomeSubtitle')}>
      <TextButton label={locale === 'zh' ? 'English' : '简体中文'} onPress={() => setLocale(locale === 'zh' ? 'en' : 'zh')} />
      {foundation ? <Body>Sign in will be available in a future preview.</Body> : null}
      <Body>{t('email')}</Body>
      <TextInput accessibilityLabel={t('email')} style={styles.input} value={email} onChangeText={setEmail}
        editable={!foundation && !busy} autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Body>{t('password')}</Body>
      <TextInput accessibilityLabel={t('password')} style={styles.input} value={password} onChangeText={setPassword}
        editable={!foundation && !busy} secureTextEntry autoCapitalize="none" autoCorrect={false}
        autoComplete="current-password" textContentType="password" />
      {mode === 'sign-up' ? <><Body>{t('confirmPassword')}</Body>
        <TextInput accessibilityLabel={t('confirmPassword')} style={styles.input} value={confirmPassword}
          onChangeText={setConfirmPassword} editable={!foundation && !busy} secureTextEntry
          autoCapitalize="none" autoCorrect={false} autoComplete="new-password" />
      </> : null}
      {success ? <Body>{success}</Body> : null}
      {error ? <ErrorState message={error} /> : null}
      <Button label={busy ? t(mode === 'sign-in' ? 'signingIn' : 'signingUp') : t(mode === 'sign-in' ? 'signIn' : 'signUp')}
        disabled={foundation || busy || !email.trim() || !password || (mode === 'sign-up' && !confirmPassword)}
        onPress={() => { void submit(); }} />
      <TextButton label={t(mode === 'sign-in' ? 'noAccount' : 'haveAccount')}
        onPress={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} />
      {foundation ? <Button label="Return to preview" onPress={() => router.replace('/')} /> : null}
    </Screen>
  </KeyboardAvoidingView>;
}

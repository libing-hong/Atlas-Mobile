import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Body, Button, Heading, Panel, Screen, styles } from '../../components/ui';
import { ErrorState, RemoteContent } from '../../components/RemoteContent';
import { useAuth } from '../../lib/auth/AuthProvider';
import { decodeMe } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
import { useI18n } from '../../lib/i18n/I18nProvider';
const neverEmpty = () => false;

export default function AccountScreen() {
  const { locale, setLocale, t } = useI18n();
  const { status, session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = useMobileResource('/api/mobile/v1/me', decodeMe, neverEmpty);
  async function handleSignOut() {
    setBusy(true); setError(null);
    try { await signOut(); } catch { setError(t('signOutError')); }
    finally { setBusy(false); }
  }
  return <Screen title={t('accountTitle')} subtitle={t('accountSubtitle')}>
    <Body>{t('accountReadOnly')}</Body>
    <Panel><Heading>{session?.user.email ?? t('notSignedIn')}</Heading>
      <Body>{status === 'foundation' ? t('previewMode') : t('signedInDevice')}</Body>
      {status === 'foundation' ? <Button label={t('viewSignIn')} onPress={() => router.push('/(auth)/sign-in')} /> : null}
    </Panel>
    {status === 'signed-in' ? <RemoteContent state={me.state} retry={me.retry}>{data =>
      <Panel><Heading>{data.user.displayName ?? t('atlasStudent')}</Heading><Body>{t('apiConnected')} · {data.preferences.locale}</Body></Panel>
    }</RemoteContent> : null}
    {status === 'signed-in' ? <Button label={t('goProfile')} onPress={() => router.push('/profile')} /> : null}
    <View style={styles.row}><Heading>{t('language')}</Heading><Body>{t('languageValue')}</Body>
      <Button label={locale === 'zh' ? 'Switch to English' : '切换为简体中文'} onPress={() => setLocale(locale === 'zh' ? 'en' : 'zh')} /></View>
    <View style={styles.row}><Heading>{t('privacy')}</Heading><Button label={t('privacyInfo')} onPress={() => router.push('/privacy')} /></View>
    <View style={styles.row}><Heading>{t('appVersion')}</Heading><Body>{Constants.expoConfig?.version ?? '0.1.0'}</Body></View>
    {error ? <ErrorState message={error} /> : null}
    <Button label={busy ? t('signingOut') : t('signOut')} disabled={status !== 'signed-in' || busy}
      onPress={() => { void handleSignOut(); }} />
  </Screen>;
}

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Body, Button, Heading, Panel, Screen, styles } from '../../components/ui';
import { ErrorState, RemoteContent } from '../../components/RemoteContent';
import { useAuth } from '../../lib/auth/AuthProvider';
import { decodeMe } from '../../lib/api/contracts';
import { useMobileResource } from '../../lib/api/use-mobile-resource';
const neverEmpty = () => false;

export default function AccountScreen() {
  const { status, session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = useMobileResource('/api/mobile/v1/me', decodeMe, neverEmpty);
  async function handleSignOut() {
    setBusy(true); setError(null);
    try { await signOut(); } catch { setError('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Screen title="Account" subtitle="Your details and preferences.">
    <Panel><Heading>{session?.user.email ?? 'Not signed in'}</Heading>
      <Body>{status === 'foundation' ? 'You are viewing the foundation preview.' : 'Signed in on this device.'}</Body>
      {status === 'foundation' ? <Button label="View sign in" onPress={() => router.push('/(auth)/sign-in')} /> : null}
    </Panel>
    {status === 'signed-in' ? <RemoteContent state={me.state} retry={me.retry}>{data =>
      <Panel><Heading>{data.user.displayName ?? 'Atlas student'}</Heading><Body>Mobile API connected · {data.preferences.locale}</Body></Panel>
    }</RemoteContent> : null}
    <View style={styles.row}><Heading>Language</Heading><Body>English · More languages coming soon</Body></View>
    <View style={styles.row}><Heading>Privacy</Heading><Button label="Privacy information" onPress={() => router.push('/privacy')} /></View>
    <View style={styles.row}><Heading>App version</Heading><Body>{Constants.expoConfig?.version ?? '0.1.0'}</Body></View>
    {error ? <ErrorState message={error} /> : null}
    <Button label={busy ? 'Signing out…' : 'Sign out'} disabled={status !== 'signed-in' || busy}
      onPress={() => { void handleSignOut(); }} />
  </Screen>;
}

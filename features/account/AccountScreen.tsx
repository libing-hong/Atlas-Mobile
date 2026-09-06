import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Body, Button, Heading, Panel, Screen, styles } from '../../components/ui';
import { ErrorState } from '../../components/RemoteContent';
import { useAuth } from '../../lib/auth/AuthProvider';

export default function AccountScreen() {
  const { status, session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <View style={styles.row}><Heading>Language</Heading><Body>English · More languages coming soon</Body></View>
    <View style={styles.row}><Heading>Privacy</Heading><Button label="Privacy information" onPress={() => router.push('/privacy')} /></View>
    <View style={styles.row}><Heading>App version</Heading><Body>{Constants.expoConfig?.version ?? '0.1.0'}</Body></View>
    {error ? <ErrorState message={error} /> : null}
    <Button label={busy ? 'Signing out…' : 'Sign out'} disabled={status !== 'signed-in' || busy}
      onPress={() => { void handleSignOut(); }} />
  </Screen>;
}

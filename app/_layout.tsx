import 'react-native-url-polyfill/auto';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth/AuthProvider';
import { ErrorState, LoadingState } from '../components/RemoteContent';
import { Screen } from '../components/ui';
import { I18nProvider, useI18n } from '../lib/i18n/I18nProvider';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <SafeAreaProvider><I18nProvider><ScreenError retry={retry} /></I18nProvider></SafeAreaProvider>;
}
function ScreenError({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  return <Screen title={t('errorTitle')}><ErrorState message={t('screenError')} retry={retry} /></Screen>;
}
function Routes() {
  const { status, retry } = useAuth();
  const { t } = useI18n();
  if (status === 'restoring') return <Screen title={t('restoreTitle')}><LoadingState /></Screen>;
  if (status === 'error') return <Screen title={t('restoreTitle')}>
    <ErrorState message={t('restoreError')} retry={retry} />
  </Screen>;
  // Foundation is a public, data-free shell, never an authenticated session.
  const canViewShell = status === 'foundation' || status === 'signed-in';
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={canViewShell}><Stack.Screen name="(tabs)" /></Stack.Protected>
    <Stack.Protected guard={status === 'signed-in'}>
      <Stack.Screen name="profile" /><Stack.Screen name="schools" /><Stack.Screen name="school" /><Stack.Screen name="application/[id]" />
    </Stack.Protected>
    <Stack.Protected guard={status !== 'signed-in'}><Stack.Screen name="(auth)" /></Stack.Protected>
    <Stack.Screen name="privacy" options={{ headerShown: true, title: t('privacy') }} />
    <Stack.Screen name="+not-found" />
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><I18nProvider><AuthProvider><StatusBar style="dark" /><Routes /></AuthProvider></I18nProvider></SafeAreaProvider>;
}

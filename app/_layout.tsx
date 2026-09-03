import 'react-native-url-polyfill/auto';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth/AuthProvider';
import { ErrorState, LoadingState } from '../components/RemoteContent';
import { Screen } from '../components/ui';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <SafeAreaProvider><Screen title="Let's try again">
    <ErrorState message="This screen could not be opened." retry={retry} />
  </Screen></SafeAreaProvider>;
}
function Routes() {
  const { status, error, retry } = useAuth();
  if (status === 'restoring') return <Screen title="Welcome back"><LoadingState /></Screen>;
  if (status === 'error') return <Screen title="Welcome back">
    <ErrorState message={error ?? 'Unable to restore your session.'} retry={retry} />
  </Screen>;
  // Foundation is a public, data-free shell, never an authenticated session.
  const canViewShell = status === 'foundation' || status === 'signed-in';
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={canViewShell}><Stack.Screen name="(tabs)" /></Stack.Protected>
    <Stack.Protected guard={status !== 'signed-in'}><Stack.Screen name="(auth)" /></Stack.Protected>
    <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy' }} />
    <Stack.Screen name="+not-found" />
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><StatusBar style="dark" /><Routes /></AuthProvider></SafeAreaProvider>;
}

import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { RemoteState } from '../types/remote-state';
import { Body, Button, Heading, Panel } from './ui';
import { tokens } from './tokens';

export function LoadingState() {
  return <View accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
    <ActivityIndicator color={tokens.color.primary} /><Body>Loading…</Body>
  </View>;
}
export function ErrorState({ message, retry }: { message: string; retry?: (() => void) | undefined }) {
  return <Panel><View accessibilityRole="alert"><Heading>Something went wrong</Heading><Body>{message}</Body></View>
    {retry ? <Button label="Try again" onPress={retry} /> : null}</Panel>;
}
export function EmptyState({ message }: { message: string }) {
  return <Panel><Heading>Nothing to show yet</Heading><Body>{message}</Body></Panel>;
}
export function RemoteContent<T>({ state, children, retry }: {
  state: RemoteState<T>; children: (data: T) => ReactNode; retry?: (() => void) | undefined;
}) {
  switch (state.status) {
    case 'loading': return <LoadingState />;
    case 'error': return <ErrorState message={state.message} retry={retry} />;
    case 'empty': return <EmptyState message={state.message} />;
    case 'unavailable': return <Panel><Heading>Coming soon</Heading><Body>{state.message}</Body></Panel>;
    case 'ready': return <>{children(state.data)}</>;
  }
}

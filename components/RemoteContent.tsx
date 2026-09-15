import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { RemoteState } from '../types/remote-state';
import { Body, Button, Heading, Panel } from './ui';
import { tokens } from './tokens';
import { useI18n } from '../lib/i18n/I18nProvider';

export function LoadingState() {
  const { t } = useI18n();
  return <View accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
    <ActivityIndicator color={tokens.color.primary} /><Body>{t('loading')}</Body>
  </View>;
}
export function ErrorState({ message, retry }: { message: string; retry?: (() => void) | undefined }) {
  const { t } = useI18n();
  return <Panel><View accessibilityRole="alert"><Heading>{t('errorTitle')}</Heading><Body>{message}</Body></View>
    {retry ? <Button label={t('retry')} onPress={retry} /> : null}</Panel>;
}
export function EmptyState({ message }: { message: string }) {
  const { t } = useI18n();
  return <Panel><Heading>{t('emptyTitle')}</Heading><Body>{message}</Body></Panel>;
}
export function RemoteContent<T>({ state, children, retry }: {
  state: RemoteState<T>; children: (data: T) => ReactNode; retry?: (() => void) | undefined;
}) {
  const { t } = useI18n();
  switch (state.status) {
    case 'loading': return <LoadingState />;
    case 'error': return <ErrorState message={state.message} retry={retry} />;
    case 'empty': return <EmptyState message={state.message} />;
    case 'unavailable': return <Panel><Heading>{t('comingSoon')}</Heading><Body>{state.message}</Body></Panel>;
    case 'ready': return <>{children(state.data)}</>;
  }
}

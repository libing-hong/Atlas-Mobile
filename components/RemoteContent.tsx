import { useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import type { RemoteState } from '../types/remote-state';
import { Body, Button, Heading, Panel, TextButton } from './ui';
import { tokens } from './tokens';
import { useI18n } from '../lib/i18n/I18nProvider';

export function LoadingState() {
  const { t } = useI18n();
  return <View accessibilityLabel={t('loading')} accessibilityState={{ busy: true }}>
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
function ErrorDetails({ state }: { state: Extract<RemoteState<unknown>, { status: 'error' }> }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return <>
    <TextButton label={t(expanded ? 'hideErrorDetails' : 'showErrorDetails')} onPress={() => setExpanded(value => !value)} />
    {expanded ? <Panel>
      <Body>{t('diagnosticCode')}: {state.errorCode}{state.httpStatus ? ` / ${state.httpStatus}` : ''}</Body>
      {state.serverCode ? <Body>{state.serverCode}</Body> : null}
      {state.requestId ? <Body>{state.requestId}</Body> : null}
    </Panel> : null}
  </>;
}
export function RemoteContent<T>({ state, children, retry, emptyMessage }: {
  state: RemoteState<T>; children: (data: T) => ReactNode; retry?: (() => void) | undefined; emptyMessage?: string;
}) {
  const { t } = useI18n();
  switch (state.status) {
    case 'loading': return <LoadingState />;
    case 'error': return <>
      <ErrorState message={state.message} retry={!state.recovery || state.recovery === 'retry' ? retry : undefined} />
      {state.recovery === 'account' ? <Button label={t('goAccount')} onPress={() => router.navigate('/(tabs)/account')} /> : null}
      {state.httpStatus === 409 && state.serverCode === 'PROFILE_REQUIRED' ?
        <Button label={t('goProfile')} onPress={() => router.push('/profile')} /> : null}
      {state.errorCode ? <ErrorDetails state={state} /> : null}
    </>;
    case 'empty': return <EmptyState message={emptyMessage ?? state.message} />;
    case 'unavailable': return <Panel><Heading>{t('comingSoon')}</Heading><Body>{state.message}</Body></Panel>;
    case 'ready': return <>{children(state.data)}</>;
  }
}

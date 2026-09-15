import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { RemoteState } from '../../types/remote-state';
import { mobileApi } from './index';
import { useI18n } from '../i18n/I18nProvider';
import { createResourceRequest, type ResourceRequestState } from './resource-request';
import { ApiError } from './client';
import { presentApiError } from './error-presentation';
import { resourceVersion, subscribeResources } from './invalidation';

export function useMobileResource<T>(path: string, decode: (body: unknown) => T, empty: (data: T) => boolean) {
  const { session, status } = useAuth();
  const { locale, t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const version = useSyncExternalStore(subscribeResources, () => resourceVersion(path), () => 0);
  const userId = session?.user.id;
  const accessToken = session?.access_token;
  const [snapshot, setSnapshot] = useState<{
    userId: typeof userId; accessToken: typeof accessToken;
    path: string; locale: typeof locale; attempt: number; version: number;
    decode: typeof decode; empty: typeof empty; result: ResourceRequestState<T>;
  } | null>(null);
  useEffect(() => {
    if (status !== 'signed-in' || !userId || !accessToken) return;
    const request = createResourceRequest({
      load: signal => mobileApi.get(path, decode, signal, locale),
      isEmpty: empty,
      onState: result => setSnapshot({ userId, accessToken, path, locale, attempt, version, decode, empty, result }),
    });
    request.start();
    return request.cancel;
  }, [status, path, decode, empty, attempt, version, userId, accessToken, locale]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  let state: RemoteState<T> = { status: 'loading' };
  if (status === 'foundation') state = { status: 'unavailable', message: t('serviceNotConnected') };
  else if (status === 'signed-out' || status === 'error') {
    const { status: httpStatus, ...presentation } = presentApiError(new ApiError('unauthenticated', ''), locale);
    state = { status: 'error', ...presentation, ...(httpStatus !== undefined ? { httpStatus } : {}) };
  } else if (status === 'signed-in' && snapshot && snapshot.userId === userId && snapshot.accessToken === accessToken &&
    snapshot.path === path && snapshot.locale === locale && snapshot.attempt === attempt && snapshot.version === version &&
    snapshot.decode === decode && snapshot.empty === empty) {
    // Hide data immediately during a render for another user, locale, or request;
    // effect cleanup alone happens too late to provide this guarantee.
    const result = snapshot.result;
    if (result.status === 'empty') state = { status: 'empty', message: t('emptyBody') };
    else if (result.status === 'error') {
      const { status: httpStatus, ...presentation } = presentApiError(result.error, locale);
      state = { status: 'error', ...presentation, ...(httpStatus !== undefined ? { httpStatus } : {}) };
    } else state = result;
  }
  return { state, retry };
}

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { RemoteState } from '../../types/remote-state';
import { mobileApi } from './index';

export function useMobileResource<T>(path: string, decode: (body: unknown) => T, empty: (data: T) => boolean) {
  const { session } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RemoteState<T>>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    void mobileApi.get(path, decode, controller.signal).then(result => {
      setState(empty(result) ? { status: 'empty', message: 'Nothing has been added yet.' } : { status: 'ready', data: result });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to load this information.' });
    });
    return () => controller.abort();
  }, [path, decode, empty, attempt, session?.access_token]);
  return { state, retry: useCallback(() => {
    setState({ status: 'loading' });
    setAttempt(value => value + 1);
  }, []) };
}

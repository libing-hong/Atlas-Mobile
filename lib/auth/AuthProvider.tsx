import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/client';

type AuthState = 'foundation' | 'restoring' | 'signed-out' | 'signed-in' | 'error';
type AuthContextValue = {
  status: AuthState;
  session: Session | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [client] = useState(getSupabaseClient);
  const [status, setStatus] = useState<AuthState>(client ? 'restoring' : 'foundation');
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!client) return;
    let active = true;
    let authEventReceived = false;
    const fail = () => {
      if (!active) return;
      setSession(null);
      setError('Your session could not be restored. Please try again.');
      setStatus('error');
    };
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEventReceived = true;
      setSession(nextSession);
      setError(null);
      setStatus(nextSession ? 'signed-in' : 'signed-out');
    });
    const timeout = setTimeout(() => { if (!authEventReceived) fail(); }, 15000);
    void client.auth.getSession().then(({ data, error: restoreError }) => {
      if (!active) return;
      clearTimeout(timeout);
      if (authEventReceived) return;
      if (restoreError) { fail(); return; }
      setSession(data.session);
      setStatus(data.session ? 'signed-in' : 'signed-out');
    }).catch(fail);
    const refresh = (state: string) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const appState = AppState.addEventListener('change', refresh);
    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.subscription.unsubscribe();
      appState.remove();
      client.auth.stopAutoRefresh();
    };
  }, [client, attempt]);
  async function signIn(email: string, password: string) {
    if (!client) throw new Error('Sign in is not available in the foundation preview.');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw new Error('Unable to sign in. Check your details and connection.');
  }
  async function signOut() {
    if (!client) return;
    const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
    if (signOutError) throw new Error('Unable to sign out. Please try again.');
    setSession(null);
    setStatus('signed-out');
  }
  return <AuthContext.Provider value={{
    status, session, error, signIn, signOut,
    retry: () => { setError(null); setStatus('restoring'); setAttempt(value => value + 1); },
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is missing.');
  return value;
}

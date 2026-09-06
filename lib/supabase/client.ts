import 'react-native-url-polyfill/auto';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { mobileConfig } from '../config';

let client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient | null {
  if (!mobileConfig.auth) return null;
  if (!client) {
    client = createClient(mobileConfig.auth.url, mobileConfig.auth.publishableKey, {
      auth: {
        storage: {
          getItem: key => SecureStore.getItemAsync(key),
          setItem: (key, value) => SecureStore.setItemAsync(key, value),
          removeItem: key => SecureStore.deleteItemAsync(key),
        },
        storageKey: 'atlas-mobile-' + mobileConfig.environment + '-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
  }
  return client;
}

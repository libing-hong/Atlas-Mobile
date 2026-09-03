import { readConfig } from './schema';

// Expo requires direct property access to inline EXPO_PUBLIC variables.
export const mobileConfig = readConfig({
  environment: process.env.EXPO_PUBLIC_APP_ENV,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  apiUrl: process.env.EXPO_PUBLIC_ATLAS_API_URL,
});

import 'tsx/cjs';
import type { ExpoConfig } from 'expo/config';
import { readConfig } from './lib/config/schema';

const config = readConfig({
  environment: process.env.EXPO_PUBLIC_APP_ENV,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  apiUrl: process.env.EXPO_PUBLIC_ATLAS_API_URL,
});
const app: ExpoConfig = {
  name: 'Atlas Mobile',
  slug: 'atlas-mobile',
  version: '0.1.0',
  scheme: 'atlas-mobile',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  plugins: ['expo-router', 'expo-secure-store'],
  ios: { supportsTablet: true, bundleIdentifier: 'com.libinghong.atlasmobile.' + config.environment },
  android: { package: 'com.libinghong.atlasmobile.' + config.environment },
  extra: { environment: config.environment, foundation: true },
};
export default app;

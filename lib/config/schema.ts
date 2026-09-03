import { approvedNonProductionTargets } from './policy';

export type Environment = 'development' | 'preview' | 'production';
export type MobileConfig = {
  environment: Exclude<Environment, 'production'>;
  auth: { url: string; publishableKey: string } | null;
};
type Input = {
  environment?: string | undefined;
  supabaseUrl?: string | undefined;
  publishableKey?: string | undefined;
  apiUrl?: string | undefined;
};
export function readConfig(input: Input): MobileConfig {
  const environment = input.environment?.trim() || 'development';
  if (environment === 'production') throw new Error('Production is disabled in Mobile V0.1.');
  if (environment !== 'development' && environment !== 'preview') {
    throw new Error('Unknown mobile environment.');
  }
  if (input.apiUrl?.trim()) throw new Error('Mobile API contracts are not approved.');
  const url = input.supabaseUrl?.trim();
  const key = input.publishableKey?.trim();
  if (!url && !key) return { environment, auth: null };
  if (!url || !key) throw new Error('Both public Supabase settings are required.');
  if (!key.startsWith('sb_publishable_')) throw new Error('Only publishable client keys are accepted.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
      parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Supabase must use an approved HTTPS origin.');
  }
  const approved = approvedNonProductionTargets.some(
    target => target.environment === environment && target.supabaseOrigin === parsed.origin,
  );
  if (!approved) throw new Error('Non-production Supabase target has not been approved.');
  return { environment, auth: { url: parsed.origin, publishableKey: key } };
}

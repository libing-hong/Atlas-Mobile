import { createApiClient } from './client';
import { mobileBusinessApiEnabled } from '../config/policy';
import { mobileConfig } from '../config';
import { getSupabaseClient } from '../supabase/client';

export const mobileApi = createApiClient({
  baseUrl: mobileConfig.api?.url ?? 'https://atlas-mobile.invalid',
  enabled: mobileBusinessApiEnabled && mobileConfig.api !== null,
  getToken: async () => {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  },
});

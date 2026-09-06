import { createApiClient } from './client';
import { mobileBusinessApiEnabled } from '../config/policy';
import { getSupabaseClient } from '../supabase/client';

// No endpoint is called from the UI. The reserved .invalid origin cannot be a server.
export const mobileApi = createApiClient({
  baseUrl: 'https://atlas-mobile.invalid',
  enabled: mobileBusinessApiEnabled,
  getToken: async () => {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  },
});

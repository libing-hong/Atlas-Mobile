import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConfig } from '../lib/config/schema';

test('development and preview start without a client', () => {
  assert.deepEqual(readConfig({}), { environment: 'development', auth: null, api: null });
  assert.deepEqual(readConfig({ environment: 'preview' }), { environment: 'preview', auth: null, api: null });
});
test('production and unknown environments fail closed', () => {
  for (const environment of ['production', 'prod', 'staging']) {
    assert.throws(() => readConfig({ environment }));
  }
});
test('unapproved API targets are refused', () => {
  assert.throws(() => readConfig({ apiUrl: 'https://example.com' }));
});
test('approved isolated Preview configuration is accepted only as an exact pair', () => {
  const input = { environment: 'preview', supabaseUrl: 'https://efvpndayardwjqtwtdmx.supabase.co',
    publishableKey: 'sb_publishable_test',
    apiUrl: 'https://atlas-os-preview-git-integration-m-1b658c-libing-hongs-projects.vercel.app' };
  assert.deepEqual(readConfig(input), { environment: 'preview',
    auth: { url: input.supabaseUrl, publishableKey: input.publishableKey }, api: { url: input.apiUrl } });
  assert.throws(() => readConfig({ ...input, apiUrl: 'https://example.com' }));
  assert.throws(() => readConfig({ ...input, environment: 'development' }));
});
test('partial, privileged and unapproved public credentials are refused', () => {
  assert.throws(() => readConfig({ supabaseUrl: 'https://example.com' }));
  assert.throws(() => readConfig({ publishableKey: 'sb_publishable_test' }));
  for (const publishableKey of ['sb_secret_test', 'legacy-jwt', 'sb_publishable_test']) {
    assert.throws(() => readConfig({ supabaseUrl: 'https://example.com', publishableKey }));
  }
});

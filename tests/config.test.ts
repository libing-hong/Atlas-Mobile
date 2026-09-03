import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConfig } from '../lib/config/schema';

test('development and preview start without a client', () => {
  assert.deepEqual(readConfig({}), { environment: 'development', auth: null });
  assert.deepEqual(readConfig({ environment: 'preview' }), { environment: 'preview', auth: null });
});
test('production and unknown environments fail closed', () => {
  for (const environment of ['production', 'prod', 'staging']) {
    assert.throws(() => readConfig({ environment }));
  }
});
test('unconfirmed API targets are refused', () => {
  assert.throws(() => readConfig({ apiUrl: 'https://example.com' }));
});
test('partial, privileged and unapproved public credentials are refused', () => {
  assert.throws(() => readConfig({ supabaseUrl: 'https://example.com' }));
  assert.throws(() => readConfig({ publishableKey: 'sb_publishable_test' }));
  for (const publishableKey of ['sb_secret_test', 'legacy-jwt', 'sb_publishable_test']) {
    assert.throws(() => readConfig({ supabaseUrl: 'https://example.com', publishableKey }));
  }
});

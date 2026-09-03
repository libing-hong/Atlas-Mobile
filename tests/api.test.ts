import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, createApiClient } from '../lib/api/client';

const path = '/api/mobile/v1/me';
const decode = (body: unknown) => body;
const errorCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;
test('disabled client makes no token or network calls', async () => {
  const client = createApiClient({ baseUrl: 'https://example.test', enabled: false,
    getToken: async () => { throw new Error('must not run'); },
    transport: async () => { throw new Error('must not run'); } });
  await assert.rejects(client.get(path, decode), errorCode('disabled'));
});
test('token is read for each request and supplied only to same-origin mobile paths', async () => {
  let count = 0;
  const headers: string[] = [];
  const client = createApiClient({ baseUrl: 'https://example.test', enabled: true,
    getToken: async () => 'test-token-' + ++count,
    transport: async (_url, init) => {
      headers.push(new Headers(init?.headers).get('Authorization') ?? '');
      assert.equal(init?.redirect, 'error');
      return new Response('{"ok":true}');
    } });
  await client.get(path, decode); await client.get(path, decode);
  assert.deepEqual(headers, ['Bearer test-token-1', 'Bearer test-token-2']);
  for (const invalid of ['https://other.test/api/mobile/v1/me', '//other.test/api/mobile/v1/me', '/api/mobile/v1/../../staff', '/api/staff']) {
    await assert.rejects(client.get(invalid, decode), errorCode('invalid-path'));
  }
  assert.equal(count, 2);
});
test('missing session never sends a request', async () => {
  const client = createApiClient({ baseUrl: 'https://example.test', enabled: true,
    getToken: async () => null, transport: async () => { throw new Error('must not run'); } });
  await assert.rejects(client.get(path, decode), errorCode('unauthenticated'));
});
test('errors are normalized without exposing response bodies', async () => {
  for (const [status, code] of [[401, 'unauthenticated'], [403, 'forbidden'], [500, 'http']] as const) {
    const client = createApiClient({ baseUrl: 'https://example.test', enabled: true,
      getToken: async () => 'test', transport: async () => new Response('private server detail', { status }) });
    await assert.rejects(client.get(path, decode), errorCode(code));
  }
  const client = createApiClient({ baseUrl: 'https://example.test', enabled: true,
    getToken: async () => 'test', transport: async () => new Response('not json') });
  await assert.rejects(client.get(path, decode), errorCode('invalid-response'));
});
test('timeouts and caller cancellation are distinct', async () => {
  const transport: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    const abort = () => reject(new Error('aborted'));
    if (init?.signal?.aborted) abort();
    else init?.signal?.addEventListener('abort', abort, { once: true });
  });
  const client = createApiClient({ baseUrl: 'https://example.test', enabled: true,
    getToken: async () => 'test', transport, timeoutMs: 5 });
  await assert.rejects(client.get(path, decode), errorCode('timeout'));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(client.get(path, decode, controller.signal), errorCode('cancelled'));
});

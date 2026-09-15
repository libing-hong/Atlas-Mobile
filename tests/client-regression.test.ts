import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, createApiClient } from '../lib/api/client';

const path = '/api/mobile/v1/current-matters';
const decode = (body: unknown) => body;
const hasCode = (code: string, status?: number) => (error: unknown) =>
  error instanceof ApiError && error.code === code && (status === undefined || error.status === status);
const base = { baseUrl: 'https://offline-fixture.invalid', enabled: true, getToken: async () => 'offline-fixture-only' };

test('HTTP-01: every request sends requested language; Chinese is default', async () => {
  const languages: (string | null)[] = [];
  const client = createApiClient({ ...base, transport: async (_url, init) => {
    const headers = new Headers(init?.headers);
    languages.push(headers.get('Accept-Language'));
    assert.equal(headers.get('Accept'), 'application/json');
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    return new Response('{}');
  } });
  await client.get(path, decode); await client.get(path, decode, undefined, 'en');
  await client.get(path, decode, undefined, 'zh');
  assert.deepEqual(languages, ['zh-CN', 'en', 'zh-CN']);
});

test('HTTP-02: 401/403/404/409/429/503 remain distinct statuses', async () => {
  for (const [status, code] of [[401, 'unauthenticated'], [403, 'forbidden'],
    [404, 'http'], [409, 'http'], [429, 'http'], [503, 'http']] as const) {
    const client = createApiClient({ ...base, transport: async () => new Response('{"error":{"message":"never-render-this"}}', { status }) });
    await assert.rejects(client.get(path, decode), error => hasCode(code, status)(error) &&
      error instanceof Error && !error.message.includes('never-render-this'));
  }
});

test('HTTP-03: cancel during secure token restore prevents network entirely', async () => {
  let resolve!: (token: string) => void;
  const token = new Promise<string>(done => { resolve = done; });
  let calls = 0;
  const client = createApiClient({ ...base, getToken: () => token, transport: async () => { calls++; return new Response('{}'); } });
  const controller = new AbortController();
  const result = client.get(path, decode, controller.signal);
  controller.abort(); resolve('offline-fixture-only');
  await assert.rejects(result, hasCode('cancelled')); assert.equal(calls, 0);
});

test('HTTP-04: cancel after response arrives but while JSON is pending forbids decode', async () => {
  let resolve!: (body: unknown) => void;
  let entered!: () => void;
  const jsonEntered = new Promise<void>(done => { entered = done; });
  const pendingBody = new Promise<unknown>(done => { resolve = done; });
  const response = new Response('{}');
  response.json = () => { entered(); return pendingBody; };
  let decodeCalls = 0;
  const client = createApiClient({ ...base, transport: async () => response });
  const controller = new AbortController();
  const result = client.get(path, body => { decodeCalls++; return body; }, controller.signal);
  await jsonEntered; controller.abort(); resolve({ oldUser: true });
  await assert.rejects(result, hasCode('cancelled')); assert.equal(decodeCalls, 0);
});

test('HTTP-05: abort-ignoring transport success cannot escape cancelled request', async () => {
  let resolve!: (response: Response) => void;
  let entered!: () => void;
  const transportEntered = new Promise<void>(done => { entered = done; });
  const pending = new Promise<Response>(done => { resolve = done; });
  const client = createApiClient({ ...base, transport: async () => { entered(); return pending; } });
  const controller = new AbortController();
  const result = client.get(path, decode, controller.signal);
  await transportEntered; controller.abort(); resolve(new Response('{}'));
  await assert.rejects(result, hasCode('cancelled'));
});

test('HTTP-06: disallowed Core query/body paths never obtain a token or call transport', async () => {
  let calls = 0;
  const client = createApiClient({ ...base, getToken: async () => { calls++; return 'offline'; },
    transport: async () => { calls++; return new Response('{}'); } });
  for (const suffix of ['?userId=other-user', '?limit=10', '#account']) {
    await assert.rejects(client.get(path + suffix, decode), hasCode('invalid-path'));
  }
  assert.equal(calls, 0);
});

test('HTTP-07: successful empty is data, but a non-JSON success is incompatible', async () => {
  const client = createApiClient({ ...base, transport: async () => new Response('{"data":{"items":[]}}') });
  assert.deepEqual(await client.get('/api/mobile/v1/applications', decode), { data: { items: [] } });
  const htmlClient = createApiClient({ ...base, transport: async () => new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }) });
  await assert.rejects(htmlClient.get(path, decode), hasCode('invalid-response'));
});

test('HTTP-08: success-body JSON abort rejection remains cancellation, not invalid-response', async () => {
  let entered!: () => void;
  const jsonEntered = new Promise<void>(done => { entered = done; });
  const controller = new AbortController();
  const client = createApiClient({ ...base, transport: async (_url, init) => {
    const response = new Response('{}');
    response.json = () => new Promise((_resolve, reject) => {
      entered();
      const abort = () => reject(new DOMException('Fixture aborted', 'AbortError'));
      if (init?.signal?.aborted) abort();
      else init?.signal?.addEventListener('abort', abort, { once: true });
    });
    return response;
  } });
  const result = client.get(path, decode, controller.signal);
  await jsonEntered; controller.abort();
  await assert.rejects(result, hasCode('cancelled'));
});

test('HTTP-09: success-body JSON timeout rejection remains retryable timeout', async () => {
  const client = createApiClient({ ...base, timeoutMs: 5, transport: async (_url, init) => {
    const response = new Response('{}');
    response.json = () => new Promise((_resolve, reject) => {
      const abort = () => reject(new DOMException('Fixture body read aborted', 'AbortError'));
      if (init?.signal?.aborted) abort();
      else init?.signal?.addEventListener('abort', abort, { once: true });
    });
    return response;
  } });
  await assert.rejects(client.get(path, decode), hasCode('timeout'));
});

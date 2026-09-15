import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, createApiClient } from '../lib/api/client';
import { presentApiError } from '../lib/api/error-presentation';

const requestId = '11111111-2222-4333-8444-555555555555';
const privateDetail = 'synthetic-person@example.invalid bearer fixture-secret';
async function responseError(body: unknown, status = 503, headers?: HeadersInit) {
  const client = createApiClient({ baseUrl: 'https://offline-fixture.invalid', enabled: true,
    getToken: async () => 'offline-fixture-only',
    transport: async () => new Response(JSON.stringify(body), { status, ...(headers ? { headers } : {}) }),
  });
  try { await client.get('/api/mobile/v1/current-matters', body => body); }
  catch (error) { assert.ok(error instanceof ApiError); return error; }
  throw new Error('Expected a typed error');
}

test('META-01: safe Core error code and UUID correlation ID survive without raw body', async () => {
  const error = await responseError({ error: { code: 'DATA_UNAVAILABLE', requestId,
    message: privateDetail, detail: { password: privateDetail } }, meta: { schemaVersion: '1' } });
  assert.equal(error.serverCode, 'DATA_UNAVAILABLE'); assert.equal(error.requestId, requestId);
  const copy = presentApiError(error, 'zh');
  assert.equal(copy.requestId, requestId); assert.equal(copy.serverCode, 'DATA_UNAVAILABLE');
  assert.ok(!JSON.stringify(error).includes(privateDetail));
  assert.ok(!JSON.stringify(copy).includes(privateDetail));
  assert.ok(!error.message.includes(privateDetail));
});

test('META-02: malicious code, requestId, and arbitrary body fields are discarded', async () => {
  for (const badId of [privateDetail, '<script>alert(1)</script>', 'a'.repeat(4096), '', 123, {}, []]) {
    const error = await responseError({ error: { code: privateDetail, requestId: badId, message: privateDetail },
      secret: privateDetail });
    assert.equal(error.serverCode, undefined); assert.equal(error.requestId, undefined);
    assert.ok(!JSON.stringify(error).includes(privateDetail));
    assert.ok(!JSON.stringify(presentApiError(error, 'zh')).includes(privateDetail));
  }
});

test('META-03: only the known server code allowlist is admitted', async () => {
  for (const code of ['ACCESS_DENIED', 'UNAUTHENTICATED', 'RATE_LIMITED', 'DATA_UNAVAILABLE',
    'METHOD_NOT_ALLOWED', 'INVALID_REQUEST', 'PROFILE_REQUIRED', 'AUTH_UNAVAILABLE', 'PREVIEW_UNAVAILABLE']) {
    const error = await responseError({ error: { code } }); assert.equal(error.serverCode, code);
  }
  for (const code of ['PRIVATE_DATABASE_NAME', '__proto__', 'constructor', 'profile_required', '']) {
    const error = await responseError({ error: { code } }); assert.equal(error.serverCode, undefined);
  }
});

test('META-04: safe header correlation survives a malicious body ID', async () => {
  const error = await responseError({ error: { code: 'DATA_UNAVAILABLE', requestId: privateDetail } },
    503, { 'X-Request-ID': requestId });
  assert.equal(error.requestId, requestId); assert.equal(error.serverCode, 'DATA_UNAVAILABLE');
});

test('META-05: constructor independently sanitizes metadata supplied outside fetch', () => {
  const error = new ApiError('http', 'safe fallback', 503, { serverCode: privateDetail, requestId: privateDetail });
  assert.equal(error.serverCode, undefined); assert.equal(error.requestId, undefined);
});

test('META-06: malformed JSON error envelope remains HTTP error, not schema success', async () => {
  for (const body of [null, [], 'not-an-object', { error: null }, { error: [] }, { error: 123 }]) {
    const error = await responseError(body); assert.equal(error.status, 503);
    assert.equal(error.code, 'http'); assert.equal(error.serverCode, undefined);
  }
});

test('META-07: unavailable auth infrastructure and preview configuration do not blame credentials', async () => {
  for (const serverCode of ['AUTH_UNAVAILABLE', 'PREVIEW_UNAVAILABLE']) {
    const error = await responseError({ error: { code: serverCode, requestId } }, 503);
    assert.equal(error.code, 'http'); assert.equal(error.serverCode, serverCode);
    const copy = presentApiError(error, 'zh');
    assert.equal(copy.recovery, 'retry'); assert.match(copy.message, /服务/);
    assert.doesNotMatch(copy.message, /密码错误|退出后重新登录|建立留学档案/);
  }
});

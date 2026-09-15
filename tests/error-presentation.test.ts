import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../lib/api/client';
import { presentApiError } from '../lib/api/error-presentation';

const privateDetail = 'PII-fixture@example.invalid internal_table.secret';

test('COPY-01: authentication and permissions have distinct non-retry recovery', () => {
  const auth = presentApiError(new ApiError('unauthenticated', privateDetail, 401), 'zh');
  const forbidden = presentApiError(new ApiError('forbidden', privateDetail, 403), 'zh');
  assert.equal(auth.recovery, 'account'); assert.equal(forbidden.recovery, 'none');
  assert.match(auth.message, /登录/); assert.match(forbidden.message, /权限|无权/);
  assert.notEqual(auth.message, forbidden.message);
});

test('COPY-02: missing endpoint is not mislabeled as a transient network fault', () => {
  const result = presentApiError(new ApiError('http', privateDetail, 404), 'zh');
  assert.equal(result.recovery, 'none'); assert.match(result.message, /接口|部署/);
});

test('COPY-03: user-observed 503 is unavailable, not wrong password or completed journey', () => {
  const result = presentApiError(new ApiError('http', privateDetail, 503), 'zh');
  assert.equal(result.recovery, 'retry'); assert.equal(result.status, 503);
  assert.match(result.message, /不可用|未获取|未加载/);
  assert.doesNotMatch(result.message, /密码错误|已完成|已加载/);
});

test('COPY-04: rate limit explains waiting, and unknown failures reveal no raw details', () => {
  const rate = presentApiError(new ApiError('http', privateDetail, 429), 'zh');
  assert.match(rate.message, /频繁|稍等/);
  const unknown = presentApiError(new Error(privateDetail), 'zh');
  assert.doesNotMatch(JSON.stringify(unknown), /PII-fixture|internal_table/);
});

test('COPY-05: all client error codes have Chinese and English safe presentation', () => {
  const codes = ['disabled', 'unauthenticated', 'forbidden', 'http', 'network', 'timeout',
    'cancelled', 'invalid-response', 'invalid-path'] as const;
  for (const code of codes) {
    const error = new ApiError(code, privateDetail);
    const zh = presentApiError(error, 'zh'); const en = presentApiError(error, 'en');
    assert.match(zh.message, /[\u3400-\u9fff]/); assert.match(en.message, /[a-zA-Z]/);
    assert.notEqual(zh.message, en.message);
    assert.ok(!zh.message.includes(privateDetail)); assert.ok(!en.message.includes(privateDetail));
  }
});

test('COPY-06: permanent compatibility/configuration failures offer no fake retry', () => {
  for (const code of ['disabled', 'invalid-response', 'invalid-path', 'cancelled'] as const) {
    assert.equal(presentApiError(new ApiError(code, privateDetail), 'zh').recovery, 'none');
  }
});

test('COPY-07: only confirmed 409 PROFILE_REQUIRED explains missing profile', () => {
  const known = presentApiError(new ApiError('http', privateDetail, 409, { serverCode: 'PROFILE_REQUIRED' }), 'zh');
  const unknown409 = presentApiError(new ApiError('http', privateDetail, 409), 'zh');
  const unavailable = presentApiError(new ApiError('http', privateDetail, 503, { serverCode: 'PROFILE_REQUIRED' }), 'zh');
  assert.equal(known.recovery, 'none'); assert.match(known.message, /档案/);
  assert.doesNotMatch(unknown409.message, /建立留学档案/);
  assert.doesNotMatch(unavailable.message, /建立留学档案/);
});

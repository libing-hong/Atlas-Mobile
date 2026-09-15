import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { classifyAuthError, presentAuthError } from '../lib/auth/error-presentation';

// Real SDK error instances, synthetic detail only, and no auth client/network.
const privateDetail = 'private-person@example.invalid token=fixture-secret internal_auth_table';

test('AUTH-ERROR-01: wrong credentials and unconfirmed email have distinct corrective instructions', () => {
  const wrong = new AuthApiError(privateDetail, 400, 'invalid_credentials');
  const unconfirmed = new AuthApiError(privateDetail, 400, 'email_not_confirmed');
  assert.equal(classifyAuthError(wrong), 'invalid-credentials');
  assert.equal(classifyAuthError(unconfirmed), 'email-unconfirmed');
  const wrongCopy = presentAuthError(wrong, 'zh');
  const unconfirmedCopy = presentAuthError(unconfirmed, 'zh');
  assert.match(wrongCopy.message, /邮箱|密码/);
  assert.match(unconfirmedCopy.message, /验证|确认/);
  assert.notEqual(wrongCopy.message, unconfirmedCopy.message);
});

test('AUTH-ERROR-02: provider rate limits and code-free Auth HTTP 429 tell users to wait', () => {
  for (const code of ['over_email_send_rate_limit', 'over_request_rate_limit', 'over_sms_send_rate_limit', undefined]) {
    const error = new AuthApiError(privateDetail, 429, code);
    assert.equal(classifyAuthError(error), 'rate-limited');
    assert.match(presentAuthError(error, 'zh').message, /稍|等|频繁/);
  }
});

test('AUTH-ERROR-03: explicit auth codes take priority over generic status guesses', () => {
  assert.equal(classifyAuthError(new AuthApiError(privateDetail, 429, 'invalid_credentials')), 'invalid-credentials');
  assert.equal(classifyAuthError(new AuthApiError(privateDetail, 429, 'future_auth_reason')), 'unknown');
  assert.equal(classifyAuthError({ status: 429 }), 'unknown');
});

test('AUTH-ERROR-04: rejected password strength asks for a password change, not an internet repair', () => {
  const error = new AuthApiError(privateDetail, 422, 'weak_password');
  assert.equal(classifyAuthError(error), 'weak-password');
  assert.match(presentAuthError(error, 'zh').message, /密码/);
  assert.doesNotMatch(presentAuthError(error, 'zh').message, /网络连接/);
});

test('AUTH-ERROR-05: confirmed SDK transport failure is classified as network', () => {
  const error = new AuthRetryableFetchError(privateDetail, 0);
  assert.equal(classifyAuthError(error), 'network');
  assert.match(presentAuthError(error, 'zh').message, /网络|连接/);
});

test('AUTH-ERROR-06: retryable service errors are not mislabeled as user network or password failures', () => {
  // Installed SDK uses this same error type for HTTP infrastructure responses.
  for (const status of [500, 502, 503, 504, 520, 530]) {
    const error = new AuthRetryableFetchError(privateDetail, status);
    assert.equal(classifyAuthError(error), 'unknown');
    assert.doesNotMatch(presentAuthError(error, 'zh').message, /密码错误|检查网络连接/);
  }
});

test('AUTH-ERROR-07: unknown API and account-existence codes retain the same safe fallback', () => {
  const generic = presentAuthError(new Error(privateDetail), 'zh');
  for (const code of ['email_exists', 'user_already_exists', 'user_not_found', 'future_auth_reason', '__proto__', 'constructor']) {
    assert.deepEqual(presentAuthError(new AuthApiError(privateDetail, 400, code), 'zh'), generic);
  }
});

test('AUTH-ERROR-08: raw messages never create a diagnosis from ambiguous text', () => {
  for (const message of ['Invalid login credentials', 'Email not confirmed', 'Network request failed', 'Failed to fetch', privateDetail]) {
    assert.equal(classifyAuthError(new Error(message)), 'unknown');
  }
});

test('AUTH-ERROR-09: malformed errors do not crash the error path or expose arbitrary details', () => {
  for (const error of [null, undefined, false, 429, privateDetail, [], {}, { code: 1 }, { code: { secret: privateDetail } }]) {
    assert.equal(classifyAuthError(error), 'unknown');
    assert.doesNotMatch(JSON.stringify(presentAuthError(error, 'zh')), /private-person|fixture-secret|internal_auth_table/);
  }
});

test('AUTH-ERROR-10: all user-facing auth failures have Chinese and English safe copy', () => {
  const errors = [
    new AuthApiError(privateDetail, 400, 'invalid_credentials'),
    new AuthApiError(privateDetail, 400, 'email_not_confirmed'),
    new AuthApiError(privateDetail, 429, 'over_request_rate_limit'),
    new AuthApiError(privateDetail, 422, 'weak_password'),
    new AuthRetryableFetchError(privateDetail, 0),
    new AuthRetryableFetchError(privateDetail, 503),
    new Error(privateDetail),
  ];
  for (const error of errors) {
    const zh = presentAuthError(error, 'zh');
    const en = presentAuthError(error, 'en');
    assert.equal(zh.kind, classifyAuthError(error));
    assert.equal(en.kind, zh.kind);
    assert.match(zh.message, /[\u3400-\u9fff]/);
    assert.match(en.message, /[a-zA-Z]/);
    assert.notEqual(zh.message, en.message);
    assert.doesNotMatch(JSON.stringify([zh, en]), /private-person|fixture-secret|internal_auth_table/);
  }
});

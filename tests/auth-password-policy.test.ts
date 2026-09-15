import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSignUpPassword } from '../lib/auth/password-policy';

// These are registration-policy tests. Existing-account sign-in must not inherit
// this gate: its password may have been created under an older server policy.
test('AUTH-PASSWORD-01: registration rejects the old eight-character policy and the nine-character boundary', () => {
  for (const password of ['', '12345678', '123456789']) {
    assert.equal(validateSignUpPassword(password), 'passwordTooShort');
  }
});

test('AUTH-PASSWORD-02: registration accepts both inclusive Web password boundaries', () => {
  assert.equal(validateSignUpPassword('1234567890'), null);
  assert.equal(validateSignUpPassword('a'.repeat(128)), null);
});

test('AUTH-PASSWORD-03: registration rejects oversized input instead of silently truncating it', () => {
  for (const password of ['a'.repeat(129), 'a'.repeat(1024)]) {
    assert.equal(validateSignUpPassword(password), 'passwordTooLong');
  }
});

test('AUTH-PASSWORD-04: password length does not trim intentional spaces or require ASCII', () => {
  assert.equal(validateSignUpPassword(' 12345678 '), null);
  assert.equal(validateSignUpPassword('汉字测试密码长度十位'), null);
});

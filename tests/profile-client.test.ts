import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, createApiClient } from '../lib/api/client';
import { decodeProfile, type ProfileValues } from '../lib/api/profile-contract';

const base = { baseUrl: 'https://offline-fixture.invalid', enabled: true,
  getToken: async () => 'offline-fixture-only' };
const decode = (body: unknown) => body;
const ownerId = 'offline-fixture-owner-a';
const hasCode = (code: string, status?: number) => (error: unknown) =>
  error instanceof ApiError && error.code === code && (status === undefined || error.status === status);
function values(): ProfileValues {
  return {
    educationLevel: 'bachelor', currentInstitution: '合成测试大学', currentMajor: '国际贸易',
    gpa: '78.70', gradingScale: '100', graduationYear: '2026', experiences: '',
    targetDegree: 'master', targetCountries: '法国,英国', targetFields: '国际贸易\n市场营销',
    intakeYear: '2027', intakeTerm: '', languages: [{ language: '英语', qualification: 'IELTS', result: '6.5' }],
    annualBudgetMin: '', annualBudgetMax: '200000', budgetCurrency: 'CNY', cityPreferences: '',
    rankingPriority: '', careerGoal: '毕业后从事国际贸易。', acceptMajorChange: true, acceptPathway: false,
  };
}

test('PROFILE-PUT-01: save uses only the fixed profile path and JSON full snapshot without cookies or redirects', async () => {
  const input = values(); const original = structuredClone(input);
  const languages: (string | null)[] = []; let tokenReads = 0; let requests = 0;
  const client = createApiClient({ ...base,
    getToken: async expectedUserId => {
      assert.equal(expectedUserId, ownerId);
      tokenReads++; return 'offline-fixture-' + tokenReads;
    },
    transport: async (url, init) => {
      requests++;
      assert.equal(url, 'https://offline-fixture.invalid/api/mobile/v1/profile');
      assert.equal(init?.method, 'PUT');
      assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Content-Type'), 'application/json');
      assert.equal(headers.get('Accept'), 'application/json');
      assert.equal(headers.get('Authorization'), 'Bearer offline-fixture-' + requests);
      assert.equal(headers.get('Cookie'), null);
      languages.push(headers.get('Accept-Language'));
      assert.deepEqual(JSON.parse(String(init?.body)), original);
      return new Response('{"savedByFixture":true}');
    },
  });
  assert.deepEqual(await client.putProfile(input, decode, undefined, undefined, ownerId), { savedByFixture: true });
  await client.putProfile(input, decode, undefined, 'en', ownerId);
  await client.putProfile(input, decode, undefined, 'zh', ownerId);
  assert.deepEqual(languages, ['zh-CN', 'en', 'zh-CN']);
  assert.equal(tokenReads, 3); assert.equal(requests, 3);
  assert.deepEqual(input, original, 'serializing a save must not mutate the editable draft');
});

test('PROFILE-PUT-02: disabled, unsigned and unsafe-origin writes cannot reach the transport', async () => {
  let calls = 0;
  const transport: typeof fetch = async () => { calls++; throw new Error('unexpected transport'); };
  const disabled = createApiClient({ ...base, enabled: false,
    getToken: async () => { calls++; return 'fixture'; }, transport });
  await assert.rejects(disabled.putProfile(values(), decode, undefined, 'zh', ownerId), hasCode('disabled'));
  const unsigned = createApiClient({ ...base, getToken: async () => null, transport });
  await assert.rejects(unsigned.putProfile(values(), decode, undefined, 'zh', ownerId), hasCode('unauthenticated'));
  for (const baseUrl of ['http://offline-fixture.invalid', 'https://user:password@offline-fixture.invalid', 'not-a-url']) {
    const client = createApiClient({ ...base, baseUrl,
      getToken: async () => { calls++; return 'fixture'; }, transport });
    await assert.rejects(client.putProfile(values(), decode, undefined, 'zh', ownerId), hasCode('invalid-path'));
  }
  assert.equal(calls, 0);
});

test('PROFILE-PUT-03: unknown ownership, nested extra fields and malformed snapshots fail before authentication', async () => {
  let calls = 0;
  const client = createApiClient({ ...base, getToken: async () => { calls++; return 'fixture'; },
    transport: async () => { calls++; return new Response('{}'); } });
  const inputs = [
    { ...values(), user_id: 'another-fixture-user' }, { ...values(), id: 'another-fixture-profile' },
    { ...values(), acceptPathway: 'true' },
    { ...values(), languages: [{ language: '英语', qualification: '', result: '', user_id: 'foreign' }] },
    { ...values(), languages: Array.from({ length: 6 }, () => ({ language: '', qualification: '', result: '' })) },
  ];
  for (const input of inputs) {
    await assert.rejects(client.putProfile(input as unknown as ProfileValues, decode, undefined, 'zh', ownerId), error =>
      hasCode('http', 422)(error) && error instanceof ApiError && error.serverCode === 'VALIDATION_ERROR');
  }
  assert.equal(calls, 0);
});

test('PROFILE-PUT-04: cancellation before or during token restoration prevents any write', async () => {
  let calls = 0; let tokenReads = 0;
  let restore!: (token: string) => void;
  const pending = new Promise<string>(resolve => { restore = resolve; });
  const client = createApiClient({ ...base, getToken: () => { tokenReads++; return pending; },
    transport: async () => { calls++; return new Response('{}'); } });
  const alreadyCancelled = new AbortController(); alreadyCancelled.abort();
  await assert.rejects(client.putProfile(values(), decode, alreadyCancelled.signal, 'zh', ownerId), hasCode('cancelled'));
  assert.equal(tokenReads, 0);
  const controller = new AbortController();
  const result = client.putProfile(values(), decode, controller.signal, 'zh', ownerId);
  controller.abort(); restore('offline-fixture-only');
  await assert.rejects(result, hasCode('cancelled'));
  assert.equal(calls, 0); assert.equal(tokenReads, 1);
});

test('PROFILE-PUT-05: an abort-ignoring write response cannot be decoded or automatically retried', async () => {
  let entered!: () => void; let finish!: (response: Response) => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  let requests = 0; let decodeCalls = 0;
  const client = createApiClient({ ...base, transport: async () => { requests++; entered(); return pending; } });
  const controller = new AbortController();
  const result = client.putProfile(values(), body => { decodeCalls++; return body; }, controller.signal, 'zh', ownerId);
  await started; controller.abort(); finish(new Response('{"data":"possibly-saved"}'));
  await assert.rejects(result, hasCode('cancelled'));
  assert.equal(requests, 1); assert.equal(decodeCalls, 0);
});

test('PROFILE-PUT-06: cancellation during deferred JSON decoding prevents stale saved state', async () => {
  let entered!: () => void; let finish!: (body: unknown) => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const pending = new Promise<unknown>(resolve => { finish = resolve; });
  const response = new Response('{}'); response.json = () => { entered(); return pending; };
  let decodeCalls = 0;
  const client = createApiClient({ ...base, transport: async () => response });
  const controller = new AbortController();
  const result = client.putProfile(values(), body => { decodeCalls++; return body; }, controller.signal, 'zh', ownerId);
  await started; controller.abort(); finish({ data: 'previous-user-profile' });
  await assert.rejects(result, hasCode('cancelled')); assert.equal(decodeCalls, 0);
});

test('PROFILE-PUT-07: aborted success and error body reads keep cancellation semantics', async () => {
  for (const status of [200, 422]) {
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const client = createApiClient({ ...base, transport: async (_url, init) => {
      const response = new Response('{}', { status });
      response.json = () => new Promise((_resolve, reject) => {
        entered();
        const abort = () => reject(new DOMException('Fixture body cancelled', 'AbortError'));
        if (init?.signal?.aborted) abort(); else init?.signal?.addEventListener('abort', abort, { once: true });
      });
      return response;
    } });
    const controller = new AbortController();
    const result = client.putProfile(values(), decode, controller.signal, 'zh', ownerId);
    await started; controller.abort();
    await assert.rejects(result, hasCode('cancelled'));
  }
});

test('PROFILE-PUT-08: timeout during either response-body path is an unknown save outcome with no automatic repeat', async () => {
  for (const status of [200, 422]) {
    let calls = 0;
    const client = createApiClient({ ...base, timeoutMs: 5, transport: async (_url, init) => {
      calls++;
      const response = new Response('{}', { status });
      response.json = () => new Promise((_resolve, reject) => {
        const abort = () => reject(new DOMException('Fixture timeout', 'AbortError'));
        if (init?.signal?.aborted) abort(); else init?.signal?.addEventListener('abort', abort, { once: true });
      });
      return response;
    } });
    await assert.rejects(client.putProfile(values(), decode, undefined, 'zh', ownerId), hasCode('timeout'));
    assert.equal(calls, 1);
  }
});

test('PROFILE-PUT-09: malformed successful responses never claim a saved profile', async () => {
  for (const body of ['', '<html>sign in</html>', '{}', '{"data":null}', '{"error":{"code":"VALIDATION_ERROR"}}']) {
    let calls = 0;
    const client = createApiClient({ ...base, transport: async () => { calls++; return new Response(body); } });
    await assert.rejects(client.putProfile(values(), decodeProfile, undefined, 'zh', ownerId), hasCode('invalid-response'));
    assert.equal(calls, 1);
  }
});

test('PROFILE-PUT-10: validation retains only known field paths and safe identifiers, never raw server details', async () => {
  const detail = 'private-fixture@example.invalid bearer fixture-secret';
  const requestId = '11111111-2222-4333-8444-555555555555';
  const client = createApiClient({ ...base, transport: async () => new Response(JSON.stringify({
    error: { code: 'VALIDATION_ERROR', requestId, message: detail,
      fields: ['annualBudgetMin', 'annualBudgetMin', 'languages', 'languages.0.language', 'languages.4.result',
        'languages.5.language', 'languages.-1.language', 'languages.01.result', 'languages.0.user_id',
        'user_id', 'constructor', '__proto__', detail, 123, null], details: { password: detail } },
  }), { status: 422 }) });
  await assert.rejects(client.putProfile(values(), decode, undefined, 'zh', ownerId), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'http'); assert.equal(error.status, 422);
    assert.equal(error.serverCode, 'VALIDATION_ERROR'); assert.equal(error.requestId, requestId);
    assert.deepEqual(error.fields, ['annualBudgetMin', 'languages', 'languages.0.language', 'languages.4.result']);
    assert.doesNotMatch(JSON.stringify(error), /private-fixture|fixture-secret|constructor|__proto__/);
    assert.ok(!error.message.includes(detail));
    return true;
  });
});

test('PROFILE-PUT-11: constructor and non-validation errors cannot smuggle arbitrary validation detail', () => {
  const allowed = new ApiError('http', 'safe', 422, { serverCode: 'VALIDATION_ERROR',
    fields: ['careerGoal', 'careerGoal', 'languages.4.qualification', 'raw-message'] });
  assert.deepEqual(allowed.fields, ['careerGoal', 'languages.4.qualification']);
  for (const serverCode of ['DATA_UNAVAILABLE', 'INVALID_REQUEST', 'UNKNOWN', undefined]) {
    const error = new ApiError('http', 'safe', 503, { ...(serverCode ? { serverCode } : {}), fields: ['careerGoal'] });
    assert.deepEqual(error.fields, []);
  }
});

test('PROFILE-PUT-12: refused statuses remain distinct and neither network nor service failure repeats a write', async () => {
  for (const [status, code] of [[401, 'unauthenticated'], [403, 'forbidden'], [404, 'http'],
    [409, 'http'], [413, 'http'], [422, 'http'], [429, 'http'], [503, 'http']] as const) {
    let calls = 0;
    const client = createApiClient({ ...base, transport: async () => { calls++; return new Response('{}', { status }); } });
    await assert.rejects(client.putProfile(values(), decode, undefined, 'zh', ownerId), hasCode(code, status));
    assert.equal(calls, 1);
  }
  let calls = 0;
  const client = createApiClient({ ...base, transport: async () => { calls++; throw new TypeError('fixture network lost'); } });
  await assert.rejects(client.putProfile(values(), decode, undefined, 'zh', ownerId), hasCode('network'));
  assert.equal(calls, 1);
});

test('PROFILE-PUT-13: a save without an explicitly bound form owner never requests a token or sends data', async () => {
  let calls = 0;
  const client = createApiClient({ ...base,
    getToken: async () => { calls++; return 'fixture'; },
    transport: async () => { calls++; return new Response('{}'); },
  });
  await assert.rejects(client.putProfile(values(), decode), hasCode('unauthenticated'));
  await assert.rejects(client.putProfile(values(), decode, undefined, 'zh', ''), hasCode('unauthenticated'));
  assert.equal(calls, 0);
});

test('PROFILE-PUT-14: form ownership reaches the asynchronous credential boundary and a mismatched session cannot write', async () => {
  // This tests the client/provider seam, not Supabase or native SecureStore.
  // The real provider's matching check requires separate integration execution.
  let entered!: () => void; let finish!: (sessionOwner: string) => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const restoredOwner = new Promise<string>(resolve => { finish = resolve; });
  let calls = 0; let requestedOwner: string | undefined;
  const client = createApiClient({ ...base,
    getToken: async expectedUserId => {
      requestedOwner = expectedUserId; entered();
      const sessionOwner = await restoredOwner;
      return expectedUserId === sessionOwner ? 'fixture-for-matching-owner' : null;
    },
    transport: async () => { calls++; return new Response('{}'); },
  });
  const result = client.putProfile(values(), decode, undefined, 'zh', ownerId);
  await started; finish('offline-fixture-owner-b');
  await assert.rejects(result, hasCode('unauthenticated'));
  assert.equal(requestedOwner, ownerId); assert.equal(calls, 0);
});

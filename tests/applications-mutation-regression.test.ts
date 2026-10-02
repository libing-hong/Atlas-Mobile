import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError, createApiClient } from '../lib/api/client';
import { createApplicationMutation, type ApplicationMutationState } from '../lib/api/application-mutation';
import { decodeApplicationCreated } from '../lib/api/school-contract';
import type { ApplicationCreated, Selection } from '../lib/api/selection-contract';

// Synthetic in-memory scenarios. These do not exercise native navigation,
// SecureStore, hosted authorization, real persistence, or a second real account.
const owner = '11111111-1111-4111-8111-111111111111';
const otherOwner = '22222222-2222-4222-8222-222222222222';
const selection: Selection = { kind: 'recommendation', id: '33333333-3333-4333-8333-333333333333' };
const appId = '44444444-4444-4444-8444-444444444444';
const created: ApplicationCreated = { applicationId: appId, created: true,
  initialization: { materials: 'completed', requirements: 'deferred' } };
const envelope = (data: unknown) => ({ data, meta: { schemaVersion: '1' } });
const apiOptions = { enabled: true, baseUrl: 'https://mobile.example.test', getToken: async () => 'offline-fixture-token' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
function scenario(options: {
  create?: (item: Selection, signal: AbortSignal, userId: string) => Promise<ApplicationCreated>;
  lookup?: (item: Selection, signal: AbortSignal, userId: string) => Promise<string | null>;
  ownerId?: string;
} = {}) {
  const states: ApplicationMutationState[] = [];
  const creates: { item: Selection; signal: AbortSignal; userId: string }[] = [];
  const lookups: { item: Selection; signal: AbortSignal; userId: string }[] = [];
  const mutation = createApplicationMutation({ ownerId: options.ownerId ?? owner, selection,
    create: async (item, signal, userId) => { creates.push({ item, signal, userId }); return options.create ? options.create(item, signal, userId) : created; },
    lookup: async (item, signal, userId) => { lookups.push({ item, signal, userId }); return options.lookup ? options.lookup(item, signal, userId) : appId; },
    onState: state => states.push(state),
  });
  return { ...mutation, states, creates, lookups };
}
const apiCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;

test('APP-MUT-01: duplicate taps and checks cannot issue overlapping writes', async () => {
  const pending = deferred<ApplicationCreated>();
  const s = scenario({ create: () => pending.promise });
  const first = s.add();
  await s.add(); await s.check();
  assert.equal(s.creates.length, 1); assert.equal(s.lookups.length, 0);
  assert.deepEqual(s.states, [{ status: 'saving' }]);
  pending.resolve(created); await first;
  assert.deepEqual(s.states.at(-1), { status: 'saved', applicationId: appId, result: created });
  await s.add(); await s.check();
  assert.equal(s.creates.length, 1); assert.equal(s.lookups.length, 0);
  assert.equal(s.creates[0]?.userId, owner);
});

test('APP-MUT-02: a lost committed response requires lookup and preserves partial initialization', async () => {
  const s = scenario({ create: async () => { throw new ApiError('network', 'private transport detail'); } });
  await s.add();
  assert.deepEqual(s.states.at(-1), { status: 'uncertain' });
  await s.add(); assert.equal(s.creates.length, 1);
  await s.check();
  assert.deepEqual(s.states.at(-1), { status: 'saved', applicationId: appId, result: null });
  assert.equal(s.lookups[0]?.userId, owner); assert.deepEqual(s.lookups[0]?.item, selection);
  assert.doesNotMatch(JSON.stringify(s.states), /private transport detail/);
  const deferredInit = scenario(); await deferredInit.add();
  const state = deferredInit.states.at(-1);
  assert.equal(state?.status, 'saved');
  if (state?.status === 'saved') assert.equal(state.result?.initialization.requirements, 'deferred');
});

test('APP-MUT-03: only a successful absence lookup permits another explicit add', async () => {
  let writes = 0;
  const s = scenario({ create: async () => { if (++writes === 1) throw new ApiError('timeout', ''); return created; }, lookup: async () => null });
  await s.add(); await s.check();
  assert.equal(writes, 1); assert.deepEqual(s.states.at(-1), { status: 'retry-ready' });
  await s.add(); assert.equal(writes, 2);
  assert.equal(s.states.at(-1)?.status, 'saved');
});

test('APP-MUT-04: failed or malformed lookup remains uncertain and cannot authorize retry', async () => {
  for (const lookup of [async () => { throw new Error('private lookup detail'); }, async () => 'not-an-application-id']) {
    const s = scenario({ create: async () => { throw new ApiError('invalid-response', ''); }, lookup });
    await s.add(); await s.check(); await s.add();
    assert.deepEqual(s.states.at(-1), { status: 'uncertain' });
    assert.equal(s.creates.length, 1); assert.equal(s.lookups.length, 1);
    assert.doesNotMatch(JSON.stringify(s.states), /private lookup detail|not-an-application-id/);
  }
});

test('APP-MUT-05: active lookup is exclusive, then confirmed membership completes without another POST', async () => {
  const pending = deferred<string | null>();
  const s = scenario({ create: async () => { throw new ApiError('network', ''); }, lookup: () => pending.promise });
  await s.add(); const check = s.check();
  await s.check(); await s.add();
  assert.equal(s.lookups.length, 1); assert.equal(s.creates.length, 1);
  assert.deepEqual(s.states.at(-1), { status: 'checking' });
  pending.resolve(appId); await check;
  assert.equal(s.states.at(-1)?.status, 'saved');
});

test('APP-MUT-06: server refusals are distinct from unknown write outcomes', async () => {
  for (const error of [new ApiError('unauthenticated', ''), new ApiError('forbidden', ''),
    ...[400, 404, 405, 409, 413, 415, 422, 429].map(status => new ApiError('http', '', status))]) {
    const s = scenario({ create: async () => { throw error; } });
    await s.add(); await s.check();
    assert.deepEqual(s.states.at(-1), { status: 'refused', error });
    assert.equal(s.lookups.length, 0);
  }
  for (const error of [new ApiError('http', '', 503), new ApiError('timeout', ''), new ApiError('invalid-response', '')]) {
    const s = scenario({ create: async () => { throw error; } });
    await s.add(); assert.deepEqual(s.states.at(-1), { status: 'uncertain' });
  }
  const invalid = scenario({ create: async () => ({ ...created, applicationId: 'not-a-uuid' }) });
  await invalid.add(); assert.deepEqual(invalid.states.at(-1), { status: 'uncertain' });
});

test('APP-MUT-07: cancelling an old account suppresses late create success and failure', async () => {
  for (const reject of [false, true]) {
    const pending = deferred<ApplicationCreated>();
    const a = scenario({ create: () => pending.promise }); const started = a.add();
    a.cancel();
    const b = scenario({ ownerId: otherOwner }); await b.add();
    if (reject) pending.reject(new Error('old-account-failure')); else pending.resolve(created);
    await started; await a.add(); await a.check();
    assert.equal(a.creates[0]?.signal.aborted, true); assert.equal(a.creates.length, 1);
    assert.deepEqual(a.states, [{ status: 'saving' }]);
    assert.equal(b.creates[0]?.userId, otherOwner); assert.equal(b.states.at(-1)?.status, 'saved');
  }
});

test('APP-MUT-08: cancelled lookup cannot produce a late saved state or reopen retry', async () => {
  for (const result of [appId, null]) {
    const pending = deferred<string | null>();
    const s = scenario({ create: async () => { throw new ApiError('network', ''); }, lookup: () => pending.promise });
    await s.add(); const checking = s.check(); s.cancel();
    pending.resolve(result); await checking; await s.add(); await s.check();
    assert.equal(s.lookups[0]?.signal.aborted, true);
    assert.deepEqual(s.states.map(state => state.status), ['saving', 'uncertain', 'checking']);
    assert.equal(s.creates.length, 1); assert.equal(s.lookups.length, 1);
  }
});

test('APP-POST-01: the only selection write is owner-bound POST with explicit locale and no cookies or redirects', async () => {
  for (const locale of ['zh', 'en'] as const) {
    const client = createApiClient({ ...apiOptions, getToken: async id => { assert.equal(id, owner); return 'offline-fixture-token'; },
      transport: async (url, init) => {
        assert.equal(String(url), apiOptions.baseUrl + '/api/mobile/v1/applications');
        assert.equal(init?.method, 'POST'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('accept-language'), locale === 'zh' ? 'zh-CN' : 'en');
        assert.equal(headers.get('content-type'), 'application/json');
        assert.deepEqual(JSON.parse(String(init?.body)), { selection });
        return Response.json(envelope(created));
      } });
    assert.deepEqual(await client.postApplication(selection, decodeApplicationCreated, undefined, locale, owner), created);
  }
});

test('APP-POST-02: missing owner and extra authority fields fail before token reads or network writes', async () => {
  let calls = 0;
  const client = createApiClient({ ...apiOptions, getToken: async () => { calls++; return 'offline'; },
    transport: async () => { calls++; return Response.json({}); } });
  await assert.rejects(client.postApplication(selection, decodeApplicationCreated), apiCode('unauthenticated'));
  for (const input of [{ ...selection, userId: otherOwner }, { ...selection, programId: appId },
    { ...selection, status: 'accepted' }, { ...selection, evidence: {} }, { kind: 'catalog', id: selection.id }]) {
    await assert.rejects(client.postApplication(input as Selection, decodeApplicationCreated, undefined, 'zh', owner), apiCode('http'));
  }
  assert.equal(calls, 0);
});

test('APP-POST-03: account change during token restoration prevents POST and reconciliation GET', async () => {
  for (const method of ['POST', 'GET']) {
    const pending = deferred<string>(); let calls = 0; let bound: string | undefined;
    const client = createApiClient({ ...apiOptions, getToken: async id => { bound = id; return await pending.promise === id ? 'offline' : null; },
      transport: async () => { calls++; return Response.json({}); } });
    const result = method === 'POST' ? client.postApplication(selection, decodeApplicationCreated, undefined, 'zh', owner)
      : client.get('/api/mobile/v1/recommendations', value => value, undefined, 'zh', owner);
    pending.resolve(otherOwner); await assert.rejects(result, apiCode('unauthenticated'));
    assert.equal(bound, owner); assert.equal(calls, 0);
  }
});

test('APP-POST-04: ignored abort and body timeout cannot decode success or automatically repeat a write', async () => {
  const response = deferred<Response>(); const started = deferred<void>();
  let calls = 0; let decoded = 0;
  const client = createApiClient({ ...apiOptions, transport: async () => { calls++; started.resolve(); return response.promise; } });
  const controller = new AbortController();
  const write = client.postApplication(selection, value => { decoded++; return value; }, controller.signal, 'zh', owner);
  await started.promise; controller.abort(); response.resolve(Response.json(envelope(created)));
  await assert.rejects(write, apiCode('cancelled')); assert.equal(calls, 1); assert.equal(decoded, 0);
  for (const status of [200, 503]) {
    let attempts = 0;
    const timed = createApiClient({ ...apiOptions, timeoutMs: 5, transport: async (_url, init) => {
      attempts++; const body = new Response('{}', { status });
      body.json = () => new Promise((_resolve, reject) => {
        const abort = () => reject(new DOMException('offline body timeout', 'AbortError'));
        if (init?.signal?.aborted) abort(); else init?.signal?.addEventListener('abort', abort, { once: true });
      }); return body;
    } });
    await assert.rejects(timed.postApplication(selection, decodeApplicationCreated, undefined, 'zh', owner), apiCode('timeout'));
    assert.equal(attempts, 1);
  }
});

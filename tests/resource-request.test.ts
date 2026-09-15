import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createResourceRequest, type ResourceRequestState } from '../lib/api/resource-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('RACE-01: ready data is preceded by immediate loading and empty is distinct', async () => {
  for (const values of [[], ['synthetic-data']]) {
    const pending = deferred<string[]>();
    const states: ResourceRequestState<string[]>[] = [];
    const request = createResourceRequest({ load: () => pending.promise,
      isEmpty: data => data.length === 0, onState: state => states.push(state) });
    request.start();
    assert.deepEqual(states, [{ status: 'loading' }]);
    pending.resolve(values); await flush();
    assert.deepEqual(states[1], values.length ? { status: 'ready', data: values } : { status: 'empty' });
    request.cancel();
  }
});

test('RACE-02: cancellation suppresses late success even if transport ignores abort', async () => {
  const pending = deferred<string>();
  const states: ResourceRequestState<string>[] = [];
  let signal: AbortSignal | undefined;
  const request = createResourceRequest({ load: input => { signal = input; return pending.promise; },
    isEmpty: () => false, onState: state => states.push(state) });
  request.start(); request.cancel();
  assert.equal(signal?.aborted, true);
  pending.resolve('previous-user-data'); await flush();
  assert.deepEqual(states, [{ status: 'loading' }]);
});

test('RACE-03: cancellation suppresses late error', async () => {
  const pending = deferred<string>();
  const states: ResourceRequestState<string>[] = [];
  const request = createResourceRequest({ load: () => pending.promise,
    isEmpty: () => false, onState: state => states.push(state) });
  request.start(); request.cancel(); pending.reject(new Error('old-request-error'));
  await flush(); assert.deepEqual(states, [{ status: 'loading' }]);
});

test('RACE-04: retry aborts preceding request and only latest generation can succeed', async () => {
  const first = deferred<string>(); const second = deferred<string>();
  const states: ResourceRequestState<string>[] = [];
  const signals: AbortSignal[] = [];
  const request = createResourceRequest({ load: signal => {
    signals.push(signal); return signals.length === 1 ? first.promise : second.promise;
  }, isEmpty: () => false, onState: state => states.push(state) });
  request.start(); request.start();
  assert.equal(signals[0]?.aborted, true); assert.equal(signals[1]?.aborted, false);
  second.resolve('latest'); await flush(); first.resolve('stale'); await flush();
  assert.deepEqual(states, [{ status: 'loading' }, { status: 'loading' }, { status: 'ready', data: 'latest' }]);
  request.cancel();
});

test('RACE-05: prior rejection cannot overwrite successful retry', async () => {
  const first = deferred<string>(); const second = deferred<string>();
  const states: ResourceRequestState<string>[] = [];
  let calls = 0;
  const request = createResourceRequest({ load: () => ++calls === 1 ? first.promise : second.promise,
    isEmpty: () => false, onState: state => states.push(state) });
  request.start(); request.start(); second.resolve('new-locale'); await flush();
  first.reject(new Error('old-locale-error')); await flush();
  assert.deepEqual(states.at(-1), { status: 'ready', data: 'new-locale' });
  assert.equal(states.filter(item => item.status === 'error').length, 0);
  request.cancel();
});

test('RACE-06: active failure is not converted to successful empty state', async () => {
  const error = new Error('transport-rejected');
  const states: ResourceRequestState<string>[] = [];
  const request = createResourceRequest<string>({ load: async () => { throw error; },
    isEmpty: () => true, onState: state => states.push(state) });
  request.start(); await flush();
  assert.deepEqual(states, [{ status: 'loading' }, { status: 'error', error }]);
  request.cancel();
});

test('RACE-07: decoder/empty-predicate error is contained', async () => {
  const error = new Error('bad-decoder');
  const states: ResourceRequestState<string>[] = [];
  const request = createResourceRequest({ load: async () => 'payload',
    isEmpty: () => { throw error; }, onState: state => states.push(state) });
  request.start(); await flush();
  assert.deepEqual(states.at(-1), { status: 'error', error });
  request.cancel();
});

test('RACE-08: repeated cancellation is safe and next request remains usable', async () => {
  const states: ResourceRequestState<string>[] = [];
  const request = createResourceRequest({ load: async () => 'new',
    isEmpty: () => false, onState: state => states.push(state) });
  request.cancel(); request.cancel(); request.start(); await flush();
  assert.deepEqual(states, [{ status: 'loading' }, { status: 'ready', data: 'new' }]);
  request.cancel();
});

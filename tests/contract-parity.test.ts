import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeCurrentMatters, decodeJourney } from '../lib/api/contracts';

// Offline fixtures transcribed from the actual Atlas-OS Mobile API contract,
// not captured user data and not a claim that Hosted E2E has run.
// Source: integration/mobile-preview-v1, src/features/mobile-api/actions.ts
// blob 828c9aad6050e723944c302beb990b0bdb6b6e09.
const disabled = { enabled: false, kind: null, resourceId: null };
const matter = {
  id: 'fixture-current-matter', stage: 'study_profile', title: '完善留学档案',
  description: '补充申请所需信息。', status: 'ready', dueAt: null,
  dependencyTaskIds: [], action: disabled,
};
const meta = {
  requestId: '11111111-1111-4111-8111-111111111111',
  generatedAt: '2026-09-15T00:00:00.000Z', schemaVersion: '1',
};

test('PARITY: current matter accepts Core disabled action with null kind', () => {
  const data = decodeCurrentMatters({ data: {
    currentStage: 'study_profile', completed: false, primary: matter, matters: [matter],
  }, meta });
  assert.equal(data.primary?.action.enabled, false);
  assert.equal(data.primary?.action.kind, null);
});

test('PARITY: journey accepts Core disabled action without losing ordered stages', () => {
  const stages = [{ id: 'study_profile', state: 'current' }, { id: 'school_plan', state: 'upcoming' }];
  const data = decodeJourney({ data: {
    currentStage: 'study_profile', completed: false, currentTask: matter,
    stages, tasks: [matter], settling: null,
  }, meta });
  assert.deepEqual(data.stages, stages);
  assert.equal(data.tasks[0]?.action.kind, null);
});

test('PARITY: empty current matter preserves incomplete versus completed', () => {
  for (const completed of [false, true]) {
    const data = decodeCurrentMatters({ data: {
      currentStage: 'settling_in', completed, primary: null, matters: [],
    }, meta });
    assert.equal(data.completed, completed);
    assert.equal(data.primary, null);
    assert.deepEqual(data.matters, []);
  }
});

test('PARITY: matter order and server primary selection are not recomputed', () => {
  const other = { ...matter, id: 'fixture-waiting-matter', status: 'waiting' };
  const data = decodeCurrentMatters({ data: {
    currentStage: 'study_profile', completed: false, primary: other, matters: [matter, other],
  }, meta });
  assert.equal(data.primary?.id, other.id);
  assert.deepEqual(data.matters.map(item => item.id), [matter.id, other.id]);
});

test('PARITY: valid enabled Core semantic action is preserved', () => {
  const enabledMatter = { ...matter, action: { enabled: true, kind: 'OPEN_PROFILE', resourceId: null } };
  const data = decodeCurrentMatters({ data: {
    currentStage: 'study_profile', completed: false, primary: enabledMatter, matters: [enabledMatter],
  }, meta });
  assert.deepEqual(data.primary?.action, enabledMatter.action);
});

test('PARITY: malformed action fields fail closed', () => {
  for (const action of [null, [], {}, { enabled: 'true', kind: 'OPEN_PROFILE', resourceId: null },
    { enabled: true, kind: null, resourceId: null }, { enabled: true, kind: '', resourceId: null },
    { enabled: true, kind: 12, resourceId: null }, { enabled: true, kind: 'OPEN_PROFILE', resourceId: {} },
    { enabled: false, kind: null }]) {
    assert.throws(() => decodeCurrentMatters({ data: {
      currentStage: 'study_profile', completed: false, primary: { ...matter, action }, matters: [],
    }, meta }));
  }
});

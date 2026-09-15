import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicationStatusLabel, journeyStageLabel, journeyStateLabel,
  matterStatusLabel } from '../lib/i18n/business-labels';

type Label = (code: string, locale: 'zh' | 'en') => string;
function verifyLabels(label: Label, codes: string[]) {
  for (const code of codes) {
    const zh = label(code, 'zh'); const en = label(code, 'en');
    assert.match(zh, /[\u3400-\u9fff]/); assert.match(en, /[a-zA-Z]/);
    assert.doesNotMatch(zh, /暂无法显示/); assert.doesNotMatch(en, /Not available/);
    assert.notEqual(zh, en); assert.notEqual(zh, code);
  }
}

test('LABEL-01: all 11 Core application statuses have Chinese and English presentation', () => {
  verifyLabels(applicationStatusLabel, ['planning', 'preparing', 'ready_to_submit', 'submitted',
    'supplement_required', 'waiting_result', 'offer_received', 'accepted', 'declined', 'withdrawn', 'closed']);
});

test('LABEL-02: all 8 authoritative journey stages have bilingual labels', () => {
  verifyLabels(journeyStageLabel, ['study_profile', 'school_plan', 'applications', 'offer_decision',
    'visa', 'pre_departure', 'arrival', 'settling_in']);
});

test('LABEL-03: all 3 journey states have bilingual labels', () => {
  verifyLabels(journeyStateLabel, ['completed', 'current', 'upcoming']);
});

test('LABEL-04: all 5 Core matter statuses have bilingual labels', () => {
  verifyLabels(matterStatusLabel, ['ready', 'in_progress', 'waiting', 'blocked', 'completed']);
});

test('LABEL-05: unknown, empty, prototype and hostile keys yield neutral copy without echo', () => {
  for (const label of [applicationStatusLabel, journeyStageLabel, journeyStateLabel, matterStatusLabel]) {
    for (const code of ['future_status', '', '__proto__', 'constructor', 'toString',
      'private-person@example.invalid', '<script>alert(1)</script>']) {
      const zh = label(code, 'zh'); const en = label(code, 'en');
      assert.match(zh, /暂无法显示/); assert.match(en, /Not available/);
      assert.doesNotMatch(zh, /已完成|已通过|已提交/);
      if (code) { assert.ok(!zh.includes(code)); assert.ok(!en.includes(code)); }
    }
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeProfile, type ProfileValues } from '../lib/api/profile-contract';

// Confirmed with the independent Core adapter author. These are synthetic facts,
// not a student record or a guessed future endpoint. No network client is used.
function values(): ProfileValues {
  return {
    educationLevel: '', currentInstitution: '', currentMajor: '', gpa: '', gradingScale: '',
    graduationYear: '', experiences: '', targetDegree: '', targetCountries: '', targetFields: '',
    intakeYear: '', intakeTerm: '', languages: [], annualBudgetMin: '', annualBudgetMax: '',
    budgetCurrency: 'EUR', cityPreferences: '', rankingPriority: '', careerGoal: '',
    acceptMajorChange: false, acceptPathway: false,
  };
}
function envelope() {
  return { data: {
    values: values(),
    summary: { confirmedCount: 0, pendingCount: 0, missingCount: 11, completeness: 0,
      missingLabels: ['学历阶段', '目标专业方向'], nextPriority: '请先填写留学档案' },
    profileStatus: 'draft',
    pendingFacts: [] as { id: string; label: string; value: string; confidence: number | null }[],
  }, meta: { requestId: '11111111-2222-4333-8444-555555555555',
    generatedAt: '2026-09-15T16:00:00.000Z', schemaVersion: '1' } };
}

test('PROFILE-DTO-01: a first-use draft remains incomplete and editable with genuinely blank optional numbers', () => {
  const input = envelope();
  const result = decodeProfile(input);
  assert.deepEqual(result, input.data);
  assert.equal(result.values.graduationYear, '');
  assert.equal(result.values.annualBudgetMin, '');
  assert.equal(result.values.acceptMajorChange, false);
  assert.equal(result.profileStatus, 'draft');
  assert.equal(result.summary.completeness, 0);
});

test('PROFILE-DTO-02: Chinese, list text, multiple languages and preferences survive reload without coercion', () => {
  const input = envelope();
  Object.assign(input.data.values, {
    currentInstitution: '合成测试大学', gpa: '78.70', gradingScale: '100',
    targetCountries: '法国,英国', targetFields: '国际贸易\n市场营销',
    graduationYear: '2026', intakeYear: '2027', annualBudgetMin: '0', annualBudgetMax: '200000',
    languages: [{ language: '英语', qualification: 'IELTS', result: '6.5' },
      { language: '法语', qualification: '', result: '' }],
    careerGoal: '毕业后从事国际贸易。', acceptMajorChange: true, acceptPathway: false,
  });
  const result = decodeProfile(input);
  assert.deepEqual(result.values, input.data.values);
  assert.equal(result.values.gpa, '78.70');
  assert.equal(result.summary.completeness, 0, 'client must not recompute readiness from visible inputs');
});

test('PROFILE-DTO-03: authoritative readiness and pending facts remain independent from editable values', () => {
  const input = envelope();
  input.data.profileStatus = 'ready';
  input.data.summary = { confirmedCount: 9, pendingCount: 1, missingCount: 2, completeness: 75,
    missingLabels: ['职业目标', '语言情况'], nextPriority: '确认识别的信息' };
  input.data.pendingFacts = [{ id: 'fixture-pending-language', label: '语言成绩', value: 'IELTS 6.5', confidence: null }];
  const result = decodeProfile(input);
  assert.deepEqual(result.summary, input.data.summary);
  assert.deepEqual(result.pendingFacts, input.data.pendingFacts);
  assert.equal(result.values.languages.length, 0, 'unconfirmed extracted facts must not become confirmed form input');
  assert.equal(result.profileStatus, 'ready');
});

test('PROFILE-DTO-04: missing full-snapshot fields and ownership injection are rejected', () => {
  for (const field of Object.keys(values())) {
    const input = envelope();
    delete (input.data.values as unknown as Record<string, unknown>)[field];
    assert.throws(() => decodeProfile(input), `missing ${field}`);
  }
  for (const field of ['userId', 'user_id', 'id', 'completeness', 'confirmedFacts']) {
    const input = envelope();
    Object.assign(input.data.values, { [field]: 'foreign-fixture' });
    assert.throws(() => decodeProfile(input), `unexpected ${field}`);
  }
});

test('PROFILE-DTO-05: malformed form types never silently become valid data', () => {
  for (const [field, invalid] of [
    ['graduationYear', 2026], ['annualBudgetMin', 0], ['gpa', null], ['targetCountries', ['France']],
    ['acceptMajorChange', 'false'], ['acceptPathway', 0], ['languages', null],
  ] as const) {
    const input = envelope();
    Object.assign(input.data.values, { [field]: invalid });
    assert.throws(() => decodeProfile(input), String(field));
  }
  for (const languages of [[null], [{ language: '英语', qualification: 'IELTS' }],
    [{ language: '英语', qualification: 'IELTS', result: 6.5 }]]) {
    const input = envelope(); Object.assign(input.data.values, { languages });
    assert.throws(() => decodeProfile(input));
  }
});

test('PROFILE-DTO-06: summary types and unsupported lifecycle states cannot render false progress', () => {
  for (const [field, invalid] of [
    ['confirmedCount', '9'], ['pendingCount', null], ['missingCount', false],
    ['completeness', '75'], ['missingLabels', ['学历', 3]], ['nextPriority', null],
  ] as const) {
    const input = envelope(); Object.assign(input.data.summary, { [field]: invalid });
    assert.throws(() => decodeProfile(input), String(field));
  }
  for (const profileStatus of [null, 'complete', 'constructor', 1]) {
    const input = envelope(); Object.assign(input.data, { profileStatus });
    assert.throws(() => decodeProfile(input));
  }
});

test('PROFILE-DTO-07: malformed pending facts do not count as confirmed or disappear silently', () => {
  for (const pendingFacts of [null, [null], [{ id: 'fixture', label: '语言', value: '6.5' }],
    [{ id: 'fixture', label: '语言', value: '6.5', confidence: 'high' }],
    [{ id: 'fixture', label: '语言', value: ['6.5'], confidence: null }]]) {
    const input = envelope(); Object.assign(input.data, { pendingFacts });
    assert.throws(() => decodeProfile(input));
  }
});

test('PROFILE-DTO-08: HTML/error/null envelopes are incompatible, while extra envelope metadata is harmless', () => {
  for (const input of [null, [], '<html>login</html>', {}, { data: null }, { data: [] },
    { error: { code: 'PROFILE_REQUIRED' } }, { data: { values: values() } }]) {
    assert.throws(() => decodeProfile(input));
  }
  const input = envelope();
  assert.deepEqual(decodeProfile({ ...input, futureMetadata: { trace: 'fixture' } }), input.data);
});

test('PROFILE-DTO-09: progress must be finite nonnegative integer data and completeness cannot exceed 100', () => {
  for (const field of ['confirmedCount', 'pendingCount', 'missingCount', 'completeness']) {
    for (const invalid of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const input = envelope(); Object.assign(input.data.summary, { [field]: invalid });
      assert.throws(() => decodeProfile(input), `${field}: ${invalid}`);
    }
  }
  const input = envelope(); input.data.summary.completeness = 101;
  assert.throws(() => decodeProfile(input));
});

test('PROFILE-DTO-10: pending confidence follows the Core finite-number contract without invented normalization', () => {
  for (const confidence of [null, 0, 0.95, 95]) {
    const input = envelope();
    input.data.pendingFacts = [{ id: 'fixture-fact', label: '语言', value: '6.5', confidence }];
    assert.equal(decodeProfile(input).pendingFacts[0]?.confidence, confidence);
  }
  for (const confidence of [Number.NaN, Number.POSITIVE_INFINITY]) {
    const input = envelope();
    input.data.pendingFacts = [{ id: 'fixture-fact', label: '语言', value: '6.5', confidence }];
    assert.throws(() => decodeProfile(input));
  }
});

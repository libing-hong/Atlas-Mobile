import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeCurrentMatters, decodeJourney } from '../lib/api/contracts';
import { decodeApplicationDetail } from '../lib/api/school-contract';

const disabled = { enabled: false, kind: null, resourceId: null };
const description = '申请档案已建立，请继续确认材料。\n院校：Atlas 测试大学\n项目：数据科学硕士';
const matter = { id: 'fixture-matter', title: '继续申请', description, status: 'ready', dueAt: null, action: disabled };
const meta = { requestId: '11111111-1111-4111-8111-111111111111', generatedAt: '2026-09-21T00:00:00.000Z', schemaVersion: '1' };

test('MATTER-ID-01: Home and Journey preserve localized school and programme context lines', () => {
  const current = decodeCurrentMatters({ data: {
    currentStage: 'applications', completed: false, primary: matter, matters: [matter],
  }, meta });
  const journey = decodeJourney({ data: {
    currentStage: 'applications', completed: false, currentTask: matter,
    stages: [{ id: 'applications', state: 'current' }], tasks: [matter], settling: null,
  }, meta });
  assert.equal(current.primary?.description, description);
  assert.equal(journey.tasks[0]?.description, description);
});

test('MATTER-ID-02: the v1 strict matter accepts identity in description without extra fields', () => {
  const result = decodeCurrentMatters({ data: {
    currentStage: 'applications', completed: false, primary: matter, matters: [matter],
  }, meta });
  assert.deepEqual(result.primary, matter);
});

test('MATTER-ID-03: strict application detail rejects unversioned matter identity fields', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const action = { enabled: false, kind: null, resourceId: null };
  const decision = {
    identity: { institutionName: 'Atlas 测试大学', programmeName: '数据科学硕士', countryCode: 'FR', degreeType: null,
      studyMode: null, duration: null, campus: null, city: null, intake: null },
    recommendationSummary: null, programmeOverview: null, applicationFacts: [], admissionsFit: [], officialSources: [], materials: [],
    evidenceState: 'pending', evidenceLabel: '待核验', verification: { programme: 'pending', admissions: 'pending', ranking: 'not_available', lastVerifiedAt: null },
    recommendationUsable: false, checkedAt: null, nextActions: [],
  };
  const application = { id, schoolName: 'Atlas 测试大学', programName: '数据科学硕士', countryCode: 'FR', degreeLevel: null,
    status: 'planning', submissionMode: null, selectedForVisa: false, materialsReady: 0, materialsTotal: 0, materials: [],
    catalogueVerification: { identity: null, legacyProgramme: null, legacySchool: null, admissions: null }, requirements: [],
    decision: { evidenceState: 'pending', programmeVerification: 'pending', admissionsVerification: 'pending', recommendationUsable: false, checkedAt: null },
    submittedAt: null, decisionAt: null, updatedAt: '2026-09-21T00:00:00Z', action: { enabled: true, kind: 'OPEN_APPLICATION', resourceId: id } };
  const nextMatter = { id, stage: 'applications', title: '继续申请', description, status: 'blocked', dueAt: null,
    dependencyTaskIds: [], action };
  for (const extra of [{ schoolName: 'Atlas 测试大学' }, { programName: '数据科学硕士' }]) {
    assert.throws(() => decodeApplicationDetail({ data: { application, decision,
      nextStep: { matter: { ...nextMatter, ...extra }, label: null, displayStatus: null, progress: null, progressIndeterminate: true } },
      meta: { schemaVersion: '1' } }));
  }
});

test('MATTER-ID-04: legacy generic descriptions remain accepted', () => {
  const legacy = { ...matter, description: '请继续完成下一步。' };
  const result = decodeCurrentMatters({ data: {
    currentStage: 'applications', completed: false, primary: legacy, matters: [legacy],
  }, meta });
  assert.equal(result.primary?.description, legacy.description);
});

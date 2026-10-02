import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeRecommendations, decodeApplicationDetail, decodeApplicationCreated, decodeSelection, type ProgrammeDecision } from '../lib/api/school-contract';

// Public-domain synthetic data matching the reviewed DTO, not captured user data.
const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const envelope = (data: unknown) => ({ data, meta: { schemaVersion: '1' } });
const decision = (): ProgrammeDecision => ({
  identity: { institutionName: '合成测试大学', programmeName: '合成测试项目', countryCode: 'FR', degreeType: null,
    studyMode: null, duration: null, campus: null, city: null, intake: null },
  recommendationSummary: null, programmeOverview: null, applicationFacts: [], admissionsFit: [], officialSources: [], materials: [],
  evidenceState: 'pending', evidenceLabel: '待核验', verification: { programme: 'pending', admissions: 'pending', ranking: 'not_available', lastVerifiedAt: null },
  recommendationUsable: false, checkedAt: null, nextActions: [],
});
const item = () => ({ selection: { kind: 'discovery', id }, selectable: true, programId: null, schoolName: '合成测试大学',
  programName: '合成测试项目', countryCode: 'FR', degreeLevel: null, officialUrl: 'https://example.test/programme', applicationId: null, decision: decision() });
const plan = () => ({ items: [item()], generation: { enabled: false, profileStale: false, runStatus: null } });
const application = () => ({ id, schoolName: '合成测试大学', programName: '合成测试项目', countryCode: 'FR', degreeLevel: null,
  status: 'planning', submissionMode: null, selectedForVisa: false, materialsReady: 0, materialsTotal: 0, materials: [],
  catalogueVerification: { identity: 'pending', legacyProgramme: null, legacySchool: null, admissions: 'pending' }, requirements: [],
  decision: { evidenceState: 'pending', programmeVerification: 'pending', admissionsVerification: 'pending', recommendationUsable: false, checkedAt: null },
  submittedAt: null, decisionAt: null, updatedAt: '2026-09-15T00:00:00Z', action: { enabled: true, kind: 'OPEN_APPLICATION', resourceId: id },
});
const detail = () => ({ application: application(), decision: decision(), nextStep: null });

test('SCHOOL-DTO-01: empty, stale and unverified discovery plans retain their distinct server facts', () => {
  const empty = { items: [], generation: { enabled: false, profileStale: true, runStatus: null } };
  assert.deepEqual(decodeRecommendations(envelope(empty)), empty);
  assert.deepEqual(decodeRecommendations(envelope(plan())), plan());
  const hidden = plan(); hidden.items[0]!.selectable = false;
  assert.equal(decodeRecommendations(envelope(hidden)).items[0]?.selectable, false);
});

test('SCHOOL-DTO-09: current plan survives another run in progress and only Core run statuses are supported', () => {
  for (const runStatus of ['queued', 'filtering', 'generating', 'validating', 'completed', 'failed', 'cancelled', null]) {
    const data = { ...plan(), generation: { enabled: true, profileStale: true, runStatus } };
    const result = decodeRecommendations(envelope(data));
    assert.equal(result.generation.runStatus, runStatus);
    assert.deepEqual(result.items, data.items);
  }
  for (const runStatus of ['ready', 'unknown', '', 1, false, undefined]) {
    assert.throws(() => decodeRecommendations(envelope({ ...plan(), generation: { enabled: false, profileStale: false, runStatus } })));
  }
});

test('SCHOOL-DTO-02: explicit selection kinds and only the identifier are accepted', () => {
  for (const kind of ['recommendation', 'discovery']) assert.deepEqual(decodeSelection({ kind, id }), { kind, id });
  for (const value of [null, [], {}, { kind: 'catalog', id }, { kind: 'recommendation', id: '../private' },
    { kind: 'recommendation', id, user_id: otherId }, { kind: 'discovery', id, status: 'current' },
    Object.assign(Object.create({ kind: 'discovery' }), { id })]) assert.throws(() => decodeSelection(value));
});

test('SCHOOL-DTO-03: created and already-existing results preserve independent deferred initialization', () => {
  for (const created of [true, false]) for (const materials of ['completed', 'deferred']) for (const requirements of ['completed', 'deferred']) {
    const data = { applicationId: id, created, initialization: { materials, requirements } };
    assert.deepEqual(decodeApplicationCreated(envelope(data)), data);
  }
  for (const data of [{ applicationId: id, created: true }, { applicationId: 'invalid', created: true, initialization: {} },
    { applicationId: id, created: 1, initialization: { materials: 'completed', requirements: 'completed' } },
    { applicationId: id, created: true, initialization: { materials: 'ready', requirements: 'completed' } },
    { applicationId: id, created: true, initialization: { materials: 'completed', requirements: 'completed' }, ownerId: otherId }]) {
    assert.throws(() => decodeApplicationCreated(envelope(data)));
  }
});

test('SCHOOL-DTO-04: missing or unsupported schema version is rejected across all new resources', () => {
  const data = { applicationId: id, created: false, initialization: { materials: 'completed', requirements: 'completed' } };
  for (const [decode, body] of [[decodeRecommendations, plan()], [decodeApplicationDetail, detail()], [decodeApplicationCreated, data]] as const) {
    for (const meta of [undefined, null, {}, { schemaVersion: 1 }, { schemaVersion: '2' }]) assert.throws(() => decode({ data: body, meta }));
  }
});

test('SCHOOL-DTO-05: unknown private fields cannot survive nested school or application DTOs', () => {
  for (const data of [
    { ...plan(), rawRecommendations: 'PRIVATE' },
    { ...plan(), items: [{ ...item(), evidence_snapshot: 'PRIVATE' }] },
    { ...plan(), items: [{ ...item(), decision: { ...decision(), internalNotes: 'PRIVATE' } }] },
    { ...plan(), items: [{ ...item(), decision: { ...decision(), identity: { ...decision().identity, user_id: otherId } } }] },
  ]) assert.throws(() => decodeRecommendations(envelope(data)));
  for (const data of [{ ...detail(), storagePath: 'PRIVATE' },
    { ...detail(), application: { ...application(), user_id: otherId } },
    { ...detail(), application: { ...application(), materials: [{ materialType: 'transcript', status: 'missing', fileName: 'PRIVATE' }] } }]) {
    assert.throws(() => decodeApplicationDetail(envelope(data)));
  }
});

test('SCHOOL-DTO-06: official links reject executable schemes, plaintext transport and URL credentials', () => {
  for (const url of ['javascript:alert(1)', 'http://example.test', 'https://user:password@example.test', '//example.test', 'file:///private']) {
    assert.throws(() => decodeRecommendations(envelope({ ...plan(), items: [{ ...item(), officialUrl: url }] })));
    const data = { ...detail(), decision: { ...decision(), officialSources: [{ kind: 'programme', label: '来源', url, checkedAt: null }] } };
    assert.throws(() => decodeApplicationDetail(envelope(data)));
  }
});

test('SCHOOL-DTO-07: zero materials stays planning and does not invent a next step or readiness', () => {
  const decoded = decodeApplicationDetail(envelope(detail()));
  assert.equal(decoded.application.status, 'planning'); assert.equal(decoded.application.materialsTotal, 0);
  assert.equal(decoded.nextStep, null); assert.equal(decoded.decision.recommendationUsable, false);
  for (const status of ['planning', 'preparing', 'ready_to_submit', 'submitted', 'supplement_required', 'waiting_result',
    'offer_received', 'accepted', 'declined', 'withdrawn', 'closed']) {
    assert.equal(decodeApplicationDetail(envelope({ ...detail(), application: { ...application(), status } })).application.status, status);
  }
  for (const value of [-1, 0.5, Number.POSITIVE_INFINITY, '1']) {
    assert.throws(() => decodeApplicationDetail(envelope({ ...detail(), application: { ...application(), materialsReady: value } })));
  }
});

test('SCHOOL-DTO-08: server next step, dependencies and nullable progress survive without reranking', () => {
  const nextStep = { matter: { id: 'server-next', stage: 'applications', title: '查看材料要求', description: '材料清单待核验',
    status: 'waiting', dueAt: null, dependencyTaskIds: ['server-prerequisite'], action: { enabled: false, kind: null, resourceId: null } },
    label: '查看要求', displayStatus: '待核验', progress: null, progressIndeterminate: true };
  assert.deepEqual(decodeApplicationDetail(envelope({ ...detail(), nextStep })).nextStep, nextStep);
  for (const progress of [-1, 101, Number.NaN]) {
    assert.throws(() => decodeApplicationDetail(envelope({ ...detail(), nextStep: { ...nextStep, progress } })));
  }
});

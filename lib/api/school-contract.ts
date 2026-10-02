import { decodeSelection, isUuid } from './selection-contract';
export { decodeSelection } from './selection-contract';
export type { Selection, ApplicationCreated } from './selection-contract';

// Explicit projection of Atlas-OS mobile-api/selection-contracts.ts. No raw
// recommendation payloads, file paths, run metadata or unknown fields survive.
type Decoder<T> = (value: unknown) => T;
type Result<D> = D extends Decoder<infer T> ? T : never;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object.');
  return value as Record<string, unknown>;
}
function shape<S extends Record<string, Decoder<unknown>>>(fields: S): Decoder<{ [K in keyof S]: Result<S[K]> }> {
  return value => {
    const row = record(value);
    if (Object.keys(row).length !== Object.keys(fields).length || Object.keys(row).some(key => !Object.hasOwn(fields, key))) throw new Error('Unsupported fields.');
    return Object.fromEntries(Object.entries(fields).map(([key, decode]) => [key, decode(row[key])])) as { [K in keyof S]: Result<S[K]> };
  };
}
const text: Decoder<string> = value => { if (typeof value !== 'string') throw new Error('Invalid text.'); return value; };
const bool: Decoder<boolean> = value => { if (typeof value !== 'boolean') throw new Error('Invalid boolean.'); return value; };
const number: Decoder<number> = value => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid number.'); return value; };
const count: Decoder<number> = value => { const n = number(value); if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid count.'); return n; };
const percent: Decoder<number> = value => { const n = number(value); if (n < 0 || n > 100) throw new Error('Invalid progress.'); return n; };
const uuid: Decoder<string> = value => { if (!isUuid(value)) throw new Error('Invalid identifier.'); return value; };
const https: Decoder<string> = value => {
  const source = text(value); const url = new URL(source);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsupported source URL.');
  return source;
};
const nullable = <T>(decode: Decoder<T>): Decoder<T | null> => value => value === null ? null : decode(value);
const list = <T>(decode: Decoder<T>): Decoder<T[]> => value => { if (!Array.isArray(value)) throw new Error('Invalid list.'); return value.map(decode); };
const choice = <const T extends readonly string[]>(values: T): Decoder<T[number]> => value => {
  const result = text(value); if (!values.includes(result)) throw new Error('Unsupported value.'); return result as T[number];
};
const nullableText = nullable(text);
const evidence = choice(['not_searched', 'searching', 'source_not_found', 'source_found', 'extraction_failed', 'verified', 'officially_unspecified', 'stale']);
const verification = choice(['verified', 'partial', 'pending', 'not_available']);
const evidenceState = choice(['verified', 'pending', 'partial', 'failed', 'stale', 'unavailable']);
const stage = choice(['study_profile', 'school_plan', 'applications', 'offer_decision', 'visa', 'pre_departure', 'arrival', 'settling_in']);
const status = choice(['planning', 'preparing', 'ready_to_submit', 'submitted', 'supplement_required', 'waiting_result', 'offer_received', 'accepted', 'declined', 'withdrawn', 'closed']);
const actionFields = shape({ enabled: bool,
  kind: nullable(choice(['OPEN_PROFILE', 'OPEN_SCHOOL_PLAN', 'OPEN_APPLICATIONS', 'OPEN_APPLICATION', 'OPEN_MATERIALS', 'OPEN_JOURNEY', 'OPEN_VISA', 'OPEN_PRE_DEPARTURE', 'OPEN_ARRIVAL', 'OPEN_SETTLING'])),
  resourceId: nullable(uuid) });
const action: typeof actionFields = value => {
  const result = actionFields(value);
  if (result.enabled ? result.kind === null : result.kind !== null || result.resourceId !== null) throw new Error('Invalid action.');
  return result;
};
const matter = shape({ id: text, stage, title: text, description: text,
  status: choice(['ready', 'in_progress', 'waiting', 'blocked', 'completed']), dueAt: nullableText,
  dependencyTaskIds: list(text), action });

export const decodeProgrammeDecision = shape({
  identity: shape({ institutionName: text, programmeName: text, countryCode: text, degreeType: nullableText,
    studyMode: nullableText, duration: nullableText, campus: nullableText, city: nullableText, intake: nullableText }),
  recommendationSummary: nullableText, programmeOverview: nullableText,
  applicationFacts: list(shape({
    key: choice(['tuition', 'tuition_currency', 'tuition_academic_year', 'application_open', 'duration', 'intake', 'deadline', 'deadline_type', 'rounds', 'campus', 'teaching_language']),
    label: text, value: nullableText, evidenceStatus: evidence, sourceUrl: nullable(https), sourceTitle: nullableText, retrievedAt: nullableText,
  })),
  admissionsFit: list(shape({ key: text, category: text, label: text, requirement: nullableText, userSituation: nullableText,
    status: choice(['meets', 'likely_meets', 'needs_review', 'not_met', 'not_required', 'unknown']),
    evidenceStatus: evidence, advice: text, sourceUrl: nullable(https), sourceTitle: nullableText })),
  officialSources: list(shape({ kind: choice(['programme', 'admissions', 'tuition', 'application', 'ranking', 'other']),
    label: text, url: https, checkedAt: nullableText })),
  materials: list(shape({ type: text, label: text, status: choice(['ready', 'needs_update', 'missing', 'not_required']) })),
  evidenceState, evidenceLabel: text,
  verification: shape({ programme: verification, admissions: verification, ranking: verification, lastVerifiedAt: nullableText }),
  recommendationUsable: bool, checkedAt: nullableText, nextActions: list(text),
});
export type ProgrammeDecision = ReturnType<typeof decodeProgrammeDecision>;
const schoolItem = shape({ selection: decodeSelection, selectable: bool, programId: nullable(uuid), schoolName: text,
  programName: text, countryCode: text, degreeLevel: nullableText, officialUrl: https, applicationId: nullable(uuid), decision: decodeProgrammeDecision });
const schoolPlan = shape({ items: list(schoolItem), generation: shape({ enabled: bool, profileStale: bool,
  runStatus: nullable(choice(['queued', 'filtering', 'generating', 'validating', 'completed', 'failed', 'cancelled'])) }) });
export type SchoolItem = ReturnType<typeof schoolItem>;
export type SchoolPlan = ReturnType<typeof schoolPlan>;

const application = shape({ id: uuid, schoolName: text, programName: text, countryCode: text, degreeLevel: nullableText, status,
  submissionMode: nullable(choice(['self_service', 'atlas_submission', 'full_service'])), selectedForVisa: bool,
  materialsReady: count, materialsTotal: count,
  materials: list(shape({ materialType: text, status: choice(['missing', 'uploaded', 'reviewing', 'accepted', 'rejected']) })),
  catalogueVerification: shape({ identity: nullableText, legacyProgramme: nullableText, legacySchool: nullableText, admissions: nullableText }),
  requirements: list(shape({ key: text, category: text, requirement: text,
    status: choice(['satisfied', 'likely_satisfied', 'action_required', 'unknown', 'not_required']) })),
  decision: shape({ evidenceState, programmeVerification: verification, admissionsVerification: verification,
    recommendationUsable: bool, checkedAt: nullableText }),
  submittedAt: nullableText, decisionAt: nullableText, updatedAt: text, action,
});
const applicationDetail = shape({ application, decision: decodeProgrammeDecision,
  nextStep: nullable(shape({ matter, label: nullableText, displayStatus: nullableText, progress: nullable(percent), progressIndeterminate: bool })) });
export type ApplicationDetail = ReturnType<typeof applicationDetail>;
const created = shape({ applicationId: uuid, created: bool,
  initialization: shape({ materials: choice(['completed', 'deferred']), requirements: choice(['completed', 'deferred']) }) });

function envelope<T>(value: unknown, decode: Decoder<T>): T {
  const body = record(value); const meta = record(body.meta);
  if (meta.schemaVersion !== '1') throw new Error('Unsupported schema version.');
  return decode(body.data);
}
export const decodeRecommendations = (value: unknown): SchoolPlan => envelope(value, schoolPlan);
export const decodeApplicationDetail = (value: unknown): ApplicationDetail => envelope(value, applicationDetail);
export const decodeApplicationCreated = (value: unknown) => envelope(value, created);

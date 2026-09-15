// Native form projection of the shared Atlas study-profile service.
export const profileStringFields = [
  'educationLevel', 'currentInstitution', 'currentMajor', 'gpa', 'gradingScale',
  'graduationYear', 'experiences', 'targetDegree', 'targetCountries', 'targetFields',
  'intakeYear', 'intakeTerm', 'annualBudgetMin', 'annualBudgetMax', 'budgetCurrency',
  'cityPreferences', 'rankingPriority', 'careerGoal',
] as const;
export type ProfileStringField = typeof profileStringFields[number];
export type ProfileValues = Record<ProfileStringField, string> & {
  languages: { language: string; qualification: string; result: string }[];
  acceptMajorChange: boolean;
  acceptPathway: boolean;
};
export type ProfileData = {
  values: ProfileValues;
  summary: {
    confirmedCount: number; pendingCount: number; missingCount: number;
    completeness: number; missingLabels: string[]; nextPriority: string;
  };
  profileStatus: 'draft' | 'ready' | 'archived';
  pendingFacts: { id: string; label: string; value: string; confidence: number | null }[];
};
const fields = new Set<string>([...profileStringFields, 'languages', 'acceptMajorChange', 'acceptPathway']);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid profile object.');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid profile text.');
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid profile option.');
  return value;
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid profile count.');
  return value;
}
export function decodeProfileValues(value: unknown): ProfileValues {
  const input = object(value);
  if (Object.keys(input).some(key => !fields.has(key))) throw new Error('Unknown profile field.');
  const text = Object.fromEntries(profileStringFields.map(key => [key, string(input[key])])) as Record<ProfileStringField, string>;
  if (!Array.isArray(input.languages) || input.languages.length > 5) throw new Error('Invalid profile languages.');
  return {
    ...text,
    languages: input.languages.map(value => {
      const row = object(value);
      if (Object.keys(row).some(key => !['language', 'qualification', 'result'].includes(key))) throw new Error('Unknown language field.');
      return { language: string(row.language), qualification: string(row.qualification), result: string(row.result) };
    }),
    acceptMajorChange: boolean(input.acceptMajorChange),
    acceptPathway: boolean(input.acceptPathway),
  };
}
export function safeProfileFields(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((field): field is string => typeof field === 'string' &&
    (fields.has(field) || /^languages\.[0-4]\.(language|qualification|result)$/.test(field))))];
}
export function decodeProfile(value: unknown): ProfileData {
  const data = object(object(value).data);
  const summary = object(data.summary);
  const completeness = count(summary.completeness);
  if (completeness > 100) throw new Error('Invalid profile completeness.');
  if (!Array.isArray(summary.missingLabels) || !Array.isArray(data.pendingFacts)) throw new Error('Invalid profile list.');
  if (!['draft', 'ready', 'archived'].includes(string(data.profileStatus))) throw new Error('Invalid profile status.');
  return {
    values: decodeProfileValues(data.values),
    summary: {
      confirmedCount: count(summary.confirmedCount), pendingCount: count(summary.pendingCount),
      missingCount: count(summary.missingCount), completeness,
      missingLabels: summary.missingLabels.map(string), nextPriority: string(summary.nextPriority),
    },
    profileStatus: data.profileStatus as ProfileData['profileStatus'],
    pendingFacts: data.pendingFacts.map(value => {
      const row = object(value);
      if (row.confidence !== null && (typeof row.confidence !== 'number' || !Number.isFinite(row.confidence))) throw new Error('Invalid profile confidence.');
      return { id: string(row.id), label: string(row.label), value: string(row.value), confidence: row.confidence as number | null };
    }),
  };
}

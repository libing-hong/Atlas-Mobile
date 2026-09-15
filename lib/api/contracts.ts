type JsonObject = Record<string, unknown>;

export type MobileAction = { enabled: boolean; kind: string; resourceId: string | null };
export type MobileMatter = { id: string; title: string; description: string; status: string; dueAt: string | null; action: MobileAction };
export type CurrentMatters = { currentStage: string; completed: boolean; primary: MobileMatter | null; matters: MobileMatter[] };
export type MobileApplication = { id: string; schoolName: string; programName: string; status: string; materialsReady: number; materialsTotal: number };
export type Applications = { items: MobileApplication[] };
export type Journey = { currentStage: string; completed: boolean; stages: { id: string; state: string }[]; tasks: MobileMatter[] };
export type Me = { user: { id: string; email: string | null; displayName: string | null }; preferences: { locale: string } };

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid response object.');
  return value as JsonObject;
}
function string(value: unknown): string { if (typeof value !== 'string') throw new Error('Invalid response string.'); return value; }
function nullableString(value: unknown): string | null { return value === null ? null : string(value); }
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') throw new Error('Invalid response boolean.'); return value; }
function number(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid response number.'); return value; }
function data(value: unknown): JsonObject { return object(object(value).data); }
function action(value: unknown): MobileAction { const item = object(value); return { enabled: boolean(item.enabled), kind: string(item.kind), resourceId: nullableString(item.resourceId) }; }
function matter(value: unknown): MobileMatter { const item = object(value); return { id: string(item.id), title: string(item.title), description: string(item.description), status: string(item.status), dueAt: nullableString(item.dueAt), action: action(item.action) }; }
function array<T>(value: unknown, decode: (item: unknown) => T): T[] { if (!Array.isArray(value)) throw new Error('Invalid response list.'); return value.map(decode); }

export function decodeCurrentMatters(value: unknown): CurrentMatters {
  const item = data(value);
  return { currentStage: string(item.currentStage), completed: boolean(item.completed), primary: item.primary === null ? null : matter(item.primary), matters: array(item.matters, matter) };
}
export function decodeApplications(value: unknown): Applications {
  const item = data(value);
  return { items: array(item.items, value => { const app = object(value); return { id: string(app.id), schoolName: string(app.schoolName), programName: string(app.programName), status: string(app.status), materialsReady: number(app.materialsReady), materialsTotal: number(app.materialsTotal) }; }) };
}
export function decodeJourney(value: unknown): Journey {
  const item = data(value);
  return { currentStage: string(item.currentStage), completed: boolean(item.completed), stages: array(item.stages, value => { const stage = object(value); return { id: string(stage.id), state: string(stage.state) }; }), tasks: array(item.tasks, matter) };
}
export function decodeMe(value: unknown): Me {
  const item = data(value); const user = object(item.user); const preferences = object(item.preferences);
  return { user: { id: string(user.id), email: nullableString(user.email), displayName: nullableString(user.displayName) }, preferences: { locale: string(preferences.locale) } };
}

export type Selection = { kind: 'recommendation' | 'discovery'; id: string };
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function decodeSelection(value: unknown): Selection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid selection.');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 2 || !Object.hasOwn(row, 'kind') || !Object.hasOwn(row, 'id') ||
      (row.kind !== 'recommendation' && row.kind !== 'discovery') || !isUuid(row.id)) throw new Error('Invalid selection.');
  return { kind: row.kind, id: row.id };
}

export type ApplicationCreated = {
  applicationId: string;
  created: boolean;
  initialization: { materials: 'completed' | 'deferred'; requirements: 'completed' | 'deferred' };
};

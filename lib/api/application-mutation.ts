import { ApiError } from './client';
import { decodeSelection, isUuid, type ApplicationCreated, type Selection } from './selection-contract';

export type ApplicationMutationState =
  | { status: 'idle' | 'saving' | 'uncertain' | 'checking' | 'retry-ready' }
  | { status: 'saved'; applicationId: string; result: ApplicationCreated | null }
  | { status: 'refused'; error: unknown };

/** One selection, one account, no automatic repeat of a possibly committed write. */
export function createApplicationMutation(options: {
  ownerId: string;
  selection: Selection;
  create: (selection: Selection, signal: AbortSignal, ownerId: string) => Promise<ApplicationCreated>;
  lookup: (selection: Selection, signal: AbortSignal, ownerId: string) => Promise<string | null>;
  onState: (state: ApplicationMutationState) => void;
}) {
  const selection = decodeSelection(options.selection);
  let state: ApplicationMutationState = { status: 'idle' };
  let controller: AbortController | null = null;
  let active = true;
  function publish(next: ApplicationMutationState) {
    state = next;
    if (active) options.onState(next);
  }
  async function add() {
    if (!active || controller || !['idle', 'retry-ready', 'refused'].includes(state.status)) return;
    if (!options.ownerId) { publish({ status: 'refused', error: new ApiError('unauthenticated', '') }); return; }
    const request = new AbortController(); controller = request;
    publish({ status: 'saving' });
    try {
      const result = await options.create(selection, request.signal, options.ownerId);
      if (!active || request.signal.aborted) return;
      if (!isUuid(result.applicationId)) throw new ApiError('invalid-response', 'Invalid application.');
      publish({ status: 'saved', applicationId: result.applicationId, result });
    } catch (error) {
      if (!active || request.signal.aborted) return;
      const refused = error instanceof ApiError && (
        ['disabled', 'invalid-path', 'unauthenticated', 'forbidden'].includes(error.code) ||
        [400, 404, 405, 409, 413, 415, 422, 429].includes(error.status ?? 0));
      publish(refused ? { status: 'refused', error } : { status: 'uncertain' });
    } finally { if (controller === request) controller = null; }
  }
  async function check() {
    if (!active || controller || state.status !== 'uncertain') return;
    const request = new AbortController(); controller = request;
    publish({ status: 'checking' });
    try {
      const applicationId = await options.lookup(selection, request.signal, options.ownerId);
      if (!active || request.signal.aborted) return;
      if (applicationId !== null && !isUuid(applicationId)) throw new ApiError('invalid-response', 'Invalid application.');
      publish(applicationId === null ? { status: 'retry-ready' } : { status: 'saved', applicationId, result: null });
    } catch {
      if (active && !request.signal.aborted) publish({ status: 'uncertain' });
    } finally { if (controller === request) controller = null; }
  }
  function cancel() { active = false; controller?.abort(); controller = null; }
  return { add, check, cancel };
}

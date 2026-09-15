export type ResourceRequestState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: unknown };

/** Owns a single request generation, including transports that ignore abort. */
export function createResourceRequest<T>({ load, isEmpty, onState }: {
  load: (signal: AbortSignal) => Promise<T>;
  isEmpty: (data: T) => boolean;
  onState: (state: ResourceRequestState<T>) => void;
}) {
  let generation = 0;
  let controller: AbortController | null = null;
  function cancel() {
    generation += 1;
    controller?.abort();
    controller = null;
  }
  function start() {
    cancel();
    const requestGeneration = generation;
    const requestController = new AbortController();
    controller = requestController;
    const isCurrent = () => generation === requestGeneration && !requestController.signal.aborted;
    onState({ status: 'loading' });
    void (async () => {
      try {
        const data = await load(requestController.signal);
        if (!isCurrent()) return;
        onState(isEmpty(data) ? { status: 'empty' } : { status: 'ready', data });
      } catch (error) {
        if (isCurrent()) onState({ status: 'error', error });
      }
    })();
  }
  return { start, cancel };
}

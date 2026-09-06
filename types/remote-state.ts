export type RemoteState<T> =
  | { status: 'unavailable'; message: string }
  | { status: 'loading' }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

// Business response shapes stay unknown until Atlas Core approves contracts.
export type UnconfirmedMobileResponse = unknown;

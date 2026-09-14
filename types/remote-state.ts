export type RemoteState<T> =
  | { status: 'unavailable'; message: string }
  | { status: 'loading' }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

// Every business response remains unknown until an endpoint-specific decoder validates it.
export type UnconfirmedMobileResponse = unknown;

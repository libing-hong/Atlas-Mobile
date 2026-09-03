export type ApiErrorCode = 'disabled' | 'unauthenticated' | 'forbidden' | 'http' |
  'network' | 'timeout' | 'cancelled' | 'invalid-response' | 'invalid-path';
export class ApiError extends Error {
  constructor(public readonly code: ApiErrorCode, message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}
type ClientOptions = {
  baseUrl: string;
  enabled: boolean;
  getToken: () => Promise<string | null>;
  transport?: typeof fetch;
  timeoutMs?: number;
};
export function createApiClient(options: ClientOptions) {
  return {
    async get<T>(path: string, decode: (body: unknown) => T, signal?: AbortSignal): Promise<T> {
      if (!options.enabled) throw new ApiError('disabled', 'Mobile services are not connected.');
      let base: URL;
      let url: URL;
      try {
        base = new URL(options.baseUrl);
        url = new URL(path, base);
      } catch {
        throw new ApiError('invalid-path', 'Unsupported API path.');
      }
      if (base.protocol !== 'https:' || base.username || base.password ||
          url.origin !== base.origin || !/^\/api\/mobile\/v1\/[a-z0-9/-]+$/.test(url.pathname) ||
          !path.startsWith('/api/mobile/v1/') || path.includes('..') || path.includes('\\')) {
        throw new ApiError('invalid-path', 'Unsupported API path.');
      }
      if (signal?.aborted) throw new ApiError('cancelled', 'Request cancelled.');
      let token: string | null;
      try { token = await options.getToken(); }
      catch { throw new ApiError('unauthenticated', 'Unable to restore your session.'); }
      if (!token) throw new ApiError('unauthenticated', 'Sign in to continue.');
      const controller = new AbortController();
      let timedOut = false;
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 15000);
      try {
        const response = await (options.transport ?? fetch)(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
          signal: controller.signal,
          redirect: 'error',
          credentials: 'omit',
        });
        if (!response.ok) {
          const code = response.status === 401 ? 'unauthenticated' :
            response.status === 403 ? 'forbidden' : 'http';
          throw new ApiError(code, 'Unable to load this information.', response.status);
        }
        try {
          return decode(await response.json() as unknown);
        } catch {
          throw new ApiError('invalid-response', 'The server response is not supported.');
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (timedOut) throw new ApiError('timeout', 'The request took too long.');
        if (controller.signal.aborted) throw new ApiError('cancelled', 'Request cancelled.');
        throw new ApiError('network', 'Check your connection and try again.');
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    },
  };
}

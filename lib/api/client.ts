export type ApiErrorCode = 'disabled' | 'unauthenticated' | 'forbidden' | 'http' |
  'network' | 'timeout' | 'cancelled' | 'invalid-response' | 'invalid-path';
// Verified against Atlas-OS 8c2c164bf256295577ed1cea2879d801d13dd879:
// mobile-api/{errors,handler,bearer,environment}.ts. Never display raw messages.
const serverErrorCodes = new Set([
  'ACCESS_DENIED', 'UNAUTHENTICATED', 'RATE_LIMITED', 'DATA_UNAVAILABLE',
  'METHOD_NOT_ALLOWED', 'INVALID_REQUEST', 'PROFILE_REQUIRED', 'AUTH_UNAVAILABLE', 'PREVIEW_UNAVAILABLE',
]);
type ErrorMetadata = { serverCode?: string; requestId?: string };
function safeMetadata(value: unknown): ErrorMetadata {
  if (!value || typeof value !== 'object') return {};
  const input = value as Record<string, unknown>;
  const serverCode = typeof input.serverCode === 'string' && serverErrorCodes.has(input.serverCode) ? input.serverCode : undefined;
  // Only a UUID correlation identifier is kept; arbitrary header/body strings
  // (which could contain personal details or tokens) never enter UI state.
  const requestId = typeof input.requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId) ? input.requestId : undefined;
  return { ...(serverCode ? { serverCode } : {}), ...(requestId ? { requestId } : {}) };
}
export class ApiError extends Error {
  readonly serverCode: string | undefined;
  readonly requestId: string | undefined;
  constructor(public readonly code: ApiErrorCode, message: string, public readonly status?: number, metadata?: ErrorMetadata) {
    super(message);
    this.name = 'ApiError';
    const safe = safeMetadata(metadata);
    this.serverCode = safe.serverCode;
    this.requestId = safe.requestId;
  }
}
type ClientOptions = {
  baseUrl: string;
  enabled: boolean;
  getToken: () => Promise<string | null>;
  transport?: typeof fetch;
  timeoutMs?: number;
};
export type ApiLocale = 'zh' | 'en';
export function createApiClient(options: ClientOptions) {
  return {
    async get<T>(path: string, decode: (body: unknown) => T, signal?: AbortSignal, locale: ApiLocale = 'zh'): Promise<T> {
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
          !path.startsWith('/api/mobile/v1/') || path.includes('..') || path.includes('\\') || url.search || url.hash) {
        throw new ApiError('invalid-path', 'Unsupported API path.');
      }
      if (signal?.aborted) throw new ApiError('cancelled', 'Request cancelled.');
      let token: string | null;
      try { token = await options.getToken(); }
      catch { throw new ApiError('unauthenticated', 'Unable to restore your session.'); }
      // The user may have signed out while secure storage was restoring a token.
      if (signal?.aborted) throw new ApiError('cancelled', 'Request cancelled.');
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
          headers: { Accept: 'application/json', 'Accept-Language': locale === 'zh' ? 'zh-CN' : 'en', Authorization: 'Bearer ' + token },
          signal: controller.signal,
          redirect: 'error',
          credentials: 'omit',
        });
        if (controller.signal.aborted) {
          throw new ApiError(timedOut ? 'timeout' : 'cancelled', 'Request did not complete.');
        }
        if (!response.ok) {
          const code = response.status === 401 ? 'unauthenticated' :
            response.status === 403 ? 'forbidden' : 'http';
          let metadata: ErrorMetadata = safeMetadata({ requestId: response.headers.get('x-request-id') });
          try {
            const body: unknown = await response.json();
            if (body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object') {
              const safe = safeMetadata({
                serverCode: 'code' in body.error ? body.error.code : undefined,
                requestId: 'requestId' in body.error ? body.error.requestId : undefined,
              });
              metadata = { ...metadata, ...safe };
            }
          } catch { /* Non-JSON error pages are never passed to the interface. */ }
          if (controller.signal.aborted) throw new ApiError(timedOut ? 'timeout' : 'cancelled', 'Request did not complete.');
          throw new ApiError(code, 'Unable to load this information.', response.status, metadata);
        }
        try {
          const body: unknown = await response.json();
          if (controller.signal.aborted) throw new ApiError(timedOut ? 'timeout' : 'cancelled', 'Request did not complete.');
          return decode(body);
        } catch (error) {
          if (error instanceof ApiError) throw error;
          if (controller.signal.aborted) throw new ApiError(timedOut ? 'timeout' : 'cancelled', 'Request did not complete.');
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

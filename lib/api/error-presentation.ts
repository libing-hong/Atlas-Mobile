import { ApiError, type ApiLocale } from './client';

type ErrorPresentation = {
  message: string;
  recovery: 'retry' | 'account' | 'none';
  errorCode: string;
  status?: number;
  serverCode?: string;
  requestId?: string;
};

const messages = {
  zh: {
    disabled: '移动端测试服务尚未连接，当前无法读取你的资料。这不是你填写信息的问题，请等待开发团队完成连接。',
    unauthenticated: '测试服务未接受当前登录状态。请到“账户”退出后重新登录；如果仍然失败，请反馈给开发团队检查测试环境。',
    forbidden: '当前账号无权读取这项信息，请反馈给开发团队核对测试账号与服务权限。无需重新填写资料。',
    missing: '当前测试服务未提供此接口，暂时无法读取信息。请反馈给开发团队检查部署版本，反复重试无法解决。',
    rateLimited: '请求过于频繁，请稍等片刻再重试。',
    unavailable: '测试服务暂时不可用，尚未获取你的资料。请稍后重试；如果持续出现，请反馈给开发团队。',
    network: '暂时无法连接服务，请检查网络后重试。当前尚未获取你的最新信息。',
    timeout: '连接超时，尚未获取你的最新信息。请检查网络并重试。',
    cancelled: '此次加载已取消。',
    invalidResponse: '测试服务返回的数据与当前 App 不兼容，请反馈给开发团队核对版本。当前无法确认你的进度。',
    invalidPath: '此功能的服务地址配置有误，请反馈给开发团队。无需修改你的手机设置。',
    unknown: '暂时无法获取信息，当前无法确认你的进度。请重试；若持续失败，请反馈给开发团队。',
    profileRequired: '请先完善留学档案，Atlas 才能根据你的情况安排下一步。',
  },
  en: {
    disabled: 'Mobile preview services are not connected, so your information cannot be loaded. Please wait for the development team to complete setup.',
    unauthenticated: 'The preview service did not accept this session. Sign out from Account and sign in again. If this continues, ask the development team to check the preview environment.',
    forbidden: 'This account cannot access this information. Ask the development team to check the test account and service permissions. You do not need to re-enter your details.',
    missing: 'This endpoint is not available in the current preview deployment. Please report this to the development team; repeated retries will not resolve it.',
    rateLimited: 'Too many requests. Please wait a little before trying again.',
    unavailable: 'The preview service is temporarily unavailable. Your information has not loaded. Try again later and report it if this continues.',
    network: 'Unable to connect. Check your network and try again. Your latest information has not loaded.',
    timeout: 'The connection timed out before your latest information loaded. Check your network and try again.',
    cancelled: 'This request was cancelled.',
    invalidResponse: 'The preview service response is not compatible with this app. Ask the development team to check the versions. Your progress cannot currently be confirmed.',
    invalidPath: 'This feature has an invalid service address. Please report it to the development team. You do not need to change your phone settings.',
    unknown: 'Unable to load this information, so your progress cannot be confirmed. Try again and report it if this continues.',
    profileRequired: 'Complete your study profile so Atlas can organise your next step.',
  },
} as const;

export function presentApiError(error: unknown, locale: ApiLocale): ErrorPresentation {
  const copy = messages[locale];
  if (!(error instanceof ApiError)) return { message: copy.unknown, recovery: 'retry', errorCode: 'unknown' };
  let key: keyof typeof copy = 'unknown';
  let recovery: ErrorPresentation['recovery'] = 'retry';
  switch (error.code) {
    case 'disabled': key = 'disabled'; recovery = 'none'; break;
    case 'unauthenticated': key = 'unauthenticated'; recovery = 'account'; break;
    case 'forbidden': key = 'forbidden'; recovery = 'none'; break;
    case 'network': key = 'network'; break;
    case 'timeout': key = 'timeout'; break;
    case 'cancelled': key = 'cancelled'; recovery = 'none'; break;
    case 'invalid-response': key = 'invalidResponse'; recovery = 'none'; break;
    case 'invalid-path': key = 'invalidPath'; recovery = 'none'; break;
    case 'http':
      if (error.status === 409 && error.serverCode === 'PROFILE_REQUIRED') { key = 'profileRequired'; recovery = 'none'; }
      else if (error.status === 404) { key = 'missing'; recovery = 'none'; }
      else if (error.status === 429) key = 'rateLimited';
      else if (error.status && error.status >= 500) key = 'unavailable';
      break;
  }
  return {
    message: copy[key], recovery, errorCode: error.code,
    ...(error.status !== undefined ? { status: error.status } : {}),
    ...(error.serverCode ? { serverCode: error.serverCode } : {}),
    ...(error.requestId ? { requestId: error.requestId } : {}),
  };
}

import { isAuthApiError, isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { Locale } from '../i18n/I18nProvider';

export type AuthErrorKind = 'invalid-credentials' | 'email-unconfirmed' | 'rate-limited'
  | 'weak-password' | 'network' | 'unknown';

const messages: Record<Locale, Record<AuthErrorKind, string>> = {
  zh: {
    'invalid-credentials': '邮箱或密码不正确，请检查后重新登录。此版本需要使用独立测试账号。',
    'email-unconfirmed': '请先完成邮箱验证：检查收件箱和垃圾邮件，按验证邮件提示操作，再手动返回 Atlas App，用同一邮箱和密码登录。请勿连续重复注册。',
    'rate-limited': '操作过于频繁，请稍后再试。如已提交注册，请先检查收件箱和垃圾邮件，避免重复提交。',
    'weak-password': '此密码未通过安全检查。请使用 10–128 位、不易猜测的新密码，并避免使用常见或已泄露的密码。',
    network: '暂时无法连接登录服务，请检查网络后重试。如刚提交注册，请先检查邮箱，再尝试登录。',
    unknown: '暂时无法完成操作，请稍后再试；如果持续失败，请反馈给开发团队。',
  },
  en: {
    'invalid-credentials': 'The email or password is incorrect. Check your details and sign in again. This version requires a separate test account.',
    'email-unconfirmed': 'Confirm your email first. Check your inbox and spam folder, follow the confirmation instructions, then manually return to Atlas App and sign in with the same email and password. Avoid repeated registration attempts.',
    'rate-limited': 'Too many attempts. Wait before trying again. If you submitted a registration request, check your inbox and spam folder before submitting again.',
    'weak-password': 'This password did not pass the security check. Choose a hard-to-guess password of 10–128 characters and avoid common or compromised passwords.',
    network: 'Unable to connect to the sign-in service. Check your network and try again. If you just submitted a registration request, check your inbox before trying to sign in.',
    unknown: 'Unable to complete this action. Try again later and report it to the development team if this continues.',
  },
};

export function classifyAuthError(error: unknown): AuthErrorKind {
  if (!isAuthError(error)) return 'unknown';
  switch (error.code) {
    case 'invalid_credentials': return 'invalid-credentials';
    case 'email_not_confirmed': return 'email-unconfirmed';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit': return 'rate-limited';
    case 'weak_password': return 'weak-password';
  }
  // Unknown server codes, including account-existence errors, stay generic.
  if (error.code) return 'unknown';
  if (isAuthApiError(error) && error.status === 429) return 'rate-limited';
  // This SDK class also covers HTTP 5xx. Only status 0 means no response.
  if (isAuthRetryableFetchError(error) && error.status === 0) return 'network';
  return 'unknown';
}

export function presentAuthError(error: unknown, locale: Locale): { kind: AuthErrorKind; message: string } {
  const kind = classifyAuthError(error);
  return { kind, message: messages[locale][kind] };
}

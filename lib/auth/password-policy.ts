// Match Atlas-OS src/features/auth/schema.ts at the approved Web baseline.
// Sign-in accepts existing passwords; these bounds apply only to registration.
export const MIN_SIGN_UP_PASSWORD_LENGTH = 10;
export const MAX_SIGN_UP_PASSWORD_LENGTH = 128;

export function validateSignUpPassword(password: string): 'passwordTooShort' | 'passwordTooLong' | null {
  if (password.length < MIN_SIGN_UP_PASSWORD_LENGTH) return 'passwordTooShort';
  if (password.length > MAX_SIGN_UP_PASSWORD_LENGTH) return 'passwordTooLong';
  return null;
}

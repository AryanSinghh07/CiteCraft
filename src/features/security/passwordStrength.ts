/** Lightweight password strength estimate (no dependencies, runs in the browser). */

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthLevel;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  /** what would make it stronger */
  tips: string[];
  /** good enough to accept */
  acceptable: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;
/** Lowest score we accept for new passwords. */
export const MIN_ACCEPTABLE_SCORE: StrengthLevel = 2;

const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop',
  'iloveyou', 'admin123', 'welcome1', 'letmein1', 'abc12345', 'football', 'sunshine', 'princess', 'monkey123',
  'citecraft', 'student1', 'student123', 'college123', 'india123', '11111111', '00000000', 'passw0rd',
]);

const LABELS: PasswordStrength['label'][] = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

export function passwordStrength(password: string, context: string[] = []): PasswordStrength {
  const tips: string[] = [];
  const lower = password.toLowerCase();
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;

  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (classes >= 3) score++;
  if (classes === 4 && password.length >= 10) score++;

  if (password.length < MIN_PASSWORD_LENGTH) tips.push(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
  else if (password.length < 12) tips.push('Longer is stronger — try 12+ characters or a short phrase');
  if (classes < 3) tips.push('Mix upper- and lower-case letters, numbers and symbols');

  // Penalties for predictable passwords.
  const personal = context
    .map(c => c.toLowerCase().split(/[@\s.]+/))
    .flat()
    .filter(part => part.length >= 3);
  if (COMMON.has(lower) || COMMON.has(lower.replace(/[^a-z0-9]/g, ''))) {
    score = 0;
    tips.unshift('This is a very common password');
  } else if (personal.some(part => lower.includes(part))) {
    score = Math.min(score, 1);
    tips.unshift("Don't include your name or email");
  }
  if (/(.)\1{3,}/.test(password)) {
    score = Math.max(0, score - 1);
    tips.push('Avoid repeating the same character');
  }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)/i.test(password)) {
    score = Math.max(0, score - 1);
    tips.push('Avoid sequences like 1234 or qwerty');
  }

  const final = Math.max(0, Math.min(4, score)) as StrengthLevel;
  return {
    score: final,
    label: LABELS[final],
    tips: [...new Set(tips)].slice(0, 3),
    acceptable: password.length >= MIN_PASSWORD_LENGTH && final >= MIN_ACCEPTABLE_SCORE,
  };
}

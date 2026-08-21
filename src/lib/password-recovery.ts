export function isRecoveryHash(hash: string): boolean {
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return "يجب أن تتكون كلمة المرور من 8 أحرف أو أرقام على الأقل.";
  if (password !== confirmation) return "كلمتا المرور غير متطابقتين.";
  return null;
}

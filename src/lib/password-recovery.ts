export function isInviteHash(hash: string | undefined): boolean {
  if (!hash) return false;
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "invite";
}

export function isInviteQuery(search: string | undefined): boolean {
  if (!search) return false;
  return new URLSearchParams(search.replace(/^\?/, "")).get("invite") === "1";
}

export function isRecoveryQuery(search: string | undefined): boolean {
  if (!search) return false;
  return new URLSearchParams(search.replace(/^\?/, "")).get("recovery") === "1";
}

export function isPasswordSetupHash(hash: string | undefined): boolean {
  if (!hash) return false;
  const type = new URLSearchParams(hash.replace(/^#/, "")).get("type");
  return type === "recovery" || type === "invite";
}

export function isPasswordSetupLocation(hash: string | undefined, search: string | undefined): boolean {
  return isPasswordSetupHash(hash) || isInviteQuery(search) || isRecoveryQuery(search);
}

export function isRecoveryHash(hash: string | undefined): boolean {
  if (!hash) return false;
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return "يجب أن تتكون كلمة المرور من 8 أحرف أو أرقام على الأقل.";
  if (password !== confirmation) return "كلمتا المرور غير متطابقتين.";
  return null;
}

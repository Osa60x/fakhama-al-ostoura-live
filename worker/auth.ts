import type { Env } from "./types";

export type AdminRole = "owner" | "manager" | "user";
export type AdminIdentity = { id: string; displayName: string | null; role: AdminRole; isActive: boolean };
type ProfileRow = { id: string; display_name: string | null; role: AdminRole; is_active: boolean };

export function toAdminIdentity(profile: ProfileRow | null | undefined): AdminIdentity | null {
  if (!profile) return null;
  return { id: profile.id, displayName: profile.display_name, role: profile.role, isActive: profile.is_active };
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: "unauthorized" | "forbidden" | "invalid_input" | "unconfigured", message: string) {
    super(message);
  }
}

function systemHeaders(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError(503, "unconfigured", "الخدمة الإدارية غير مهيأة بعد.");
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
}

export async function authenticateAdmin(request: Request, env: Env): Promise<AdminIdentity> {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) throw new ApiError(401, "unauthorized", "يلزم تسجيل الدخول.");
  const token = bearer.slice("Bearer ".length);
  const headers = systemHeaders(env);
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { ...headers, Authorization: `Bearer ${token}` } });
  if (!userResponse.ok) throw new ApiError(401, "unauthorized", "جلسة الدخول غير صالحة.");
  const user = await userResponse.json() as { id?: string };
  if (!user.id) throw new ApiError(401, "unauthorized", "جلسة الدخول غير صالحة.");
  const profileResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,display_name,role,is_active`, { headers });
  if (!profileResponse.ok) throw new ApiError(401, "unauthorized", "لا يوجد ملف صلاحيات صالح.");
  const [profileRow] = await profileResponse.json() as ProfileRow[];
  const profile = toAdminIdentity(profileRow);
  if (!profile?.isActive) throw new ApiError(403, "forbidden", "الحساب غير نشط أو لا يملك صلاحيات إدارة.");
  return profile;
}

export function requireRole(identity: AdminIdentity, roles: AdminRole[]) {
  if (!roles.includes(identity.role)) throw new ApiError(403, "forbidden", "لا تملك الصلاحية لهذه العملية.");
}

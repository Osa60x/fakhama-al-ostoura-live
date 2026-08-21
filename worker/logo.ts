import { ApiError, type AdminIdentity } from "./auth";
import { callRpc } from "./supabase";
import type { Env } from "./types";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const MIN_DIMENSION = 24;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export function validatePngLogo(bytes: Uint8Array) {
  if (bytes.byteLength < 24 || bytes.byteLength > MAX_LOGO_BYTES) throw new ApiError(400, "invalid_input", "يجب ألا يتجاوز الشعار 2MB.");
  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) throw new ApiError(415, "invalid_input", "يقبل النظام شعار PNG فقط.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width < MIN_DIMENSION || height < MIN_DIMENSION || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new ApiError(400, "invalid_input", "يجب أن تكون أبعاد الشعار بين 24 و2048 بكسل.");
  }
  return { width, height };
}

function storageHeaders(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError(503, "unconfigured", "الخدمة الإدارية غير مهيأة بعد.");
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "image/png", "x-upsert": "true" };
}

export async function uploadLogo(request: Request, env: Env, actor: AdminIdentity) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "image/png") throw new ApiError(415, "invalid_input", "يقبل النظام شعار PNG فقط.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  validatePngLogo(bytes);
  const path = `logos/${crypto.randomUUID()}.png`;
  const upload = await fetch(`${env.SUPABASE_URL}/storage/v1/object/branding/${path}`, { method: "POST", headers: storageHeaders(env), body: bytes });
  if (!upload.ok) throw new Error("LOGO_UPLOAD_FAILED");
  await callRpc(env, "set_logo_path", { p_actor: actor.id, p_logo_path: path });
  return { path, publicUrl: `${env.SUPABASE_URL}/storage/v1/object/public/branding/${path}` };
}

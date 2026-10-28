import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/escalas/supabase";
export const DEVICE_COOKIE = "volley_device_v1";
export function hashDevice(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}
export async function deviceSecret() {
  const secret = (await cookies()).get(DEVICE_COOKIE)?.value;
  return secret && /^[a-f0-9]{64}$/.test(secret) ? secret : null;
}
export async function currentPlayer() {
  const secret = await deviceSecret();
  if (!secret) return null;
  const { data, error } = await serviceClient()
    .from("volei_members")
    .select(
      "id,name,phone,is_active,blocked,is_core,membership_status,birth_date,photo_path",
    )
    .eq("device_secret_hash", hashDevice(secret))
    .maybeSingle();
  if (error) throw new Error("Não foi possível reconhecer seu acesso.");
  return data as {
    id: string;
    name: string;
    phone: string;
    is_active: boolean;
    blocked: boolean;
    is_core: boolean;
    membership_status: "approved" | "pending" | "rejected";
    birth_date: string | null;
    photo_path: string | null;
  } | null;
}

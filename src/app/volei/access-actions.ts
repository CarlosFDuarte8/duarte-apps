"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { serviceClient } from "@/lib/escalas/supabase";
import { bindDevice, deviceSecret, hashDevice } from "@/lib/volei/player-session";
import { phoneSchema } from "@/lib/volei/phone";

export async function identifyByPhone(input: unknown): Promise<{ error: string; found: boolean }> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Celular inválido.", found: false };
  const secret = (await deviceSecret()) ?? randomBytes(32).toString("hex");
  const { data, error } = await serviceClient().rpc("volei_phone_identify", {
    p_phone: parsed.data, p_secret_hash: hashDevice(secret),
  });
  if (error) return { error: error.code === "P0001" ? error.message : "Não foi possível consultar seu cadastro. Tente novamente.", found: false };
  await bindDevice(secret);
  revalidatePath("/volei", "layout");
  return { error: "", found: !!data };
}

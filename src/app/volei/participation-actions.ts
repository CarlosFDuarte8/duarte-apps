"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serviceClient } from "@/lib/escalas/supabase";
import { deviceSecret, hashDevice } from "@/lib/volei/player-session";
import { duplicateMemberMessage, requiredBirthDateSchema } from "@/lib/volei/profile";
import { studentClassSchema } from "@/lib/volei/students";

export async function reviewParticipation(input: unknown): Promise<{ error: string; message?: string; joined?: boolean }> {
  const parsed = z.object({
    eventId: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    birthDate: requiredBirthDateSchema, enrollment: studentClassSchema,
  }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados do cadastro." };
  const secret = parsed.data.token ? null : await deviceSecret();
  if (!secret && !parsed.data.token) return { error: "Abra a página pelo navegador em que seu acesso está salvo." };
  const { data, error } = await serviceClient().rpc("volei_review_and_join", {
    p_event: parsed.data.eventId,
    p_secret_hash: secret ? hashDevice(secret) : null,
    p_token: parsed.data.token ?? null,
    p_birth_date: parsed.data.birthDate,
    p_days: parsed.data.enrollment.days,
    p_class_time: parsed.data.enrollment.classTime,
  });
  if (error) return { error: error.code === "P0001" ? error.message : error.code === "23505" ? duplicateMemberMessage : "Não foi possível atualizar seus dados. Tente novamente." };
  revalidatePath("/volei", "layout");
  revalidatePath("/admin/volei", "layout");
  return { error: "", message: data?.message ?? "Dados atualizados.", joined: data?.joined === true };
}

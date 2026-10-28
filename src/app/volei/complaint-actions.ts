"use server";
import { revalidatePath } from "next/cache";
import { serviceClient } from "@/lib/escalas/supabase";
import { deviceSecret, hashDevice } from "@/lib/volei/player-session";
import { complaintSchema } from "@/lib/volei/complaints";
export async function submitComplaint(
  input: unknown,
): Promise<{ error: string; id?: string }> {
  const parsed = complaintSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const secret = await deviceSecret();
  if (!secret)
    return { error: "Identifique seu telefone para enviar o relato." };
  const data = parsed.data;
  const result = await serviceClient().rpc("volei_submit_complaint", {
    p_secret_hash: hashDevice(secret),
    p_target_type: data.targetType,
    p_target: data.targetId,
    p_event: data.eventId,
    p_title: data.title,
    p_description: data.description,
    p_submission_key: data.submissionKey,
  });
  if (result.error)
    return {
      error:
        result.error.code === "P0001"
          ? result.error.message
          : "Não foi possível enviar agora. Tente novamente.",
    };
  revalidatePath("/admin/volei", "layout");
  return { error: "", id: result.data };
}

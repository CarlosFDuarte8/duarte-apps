"use server";
import { revalidatePath } from "next/cache";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { whatsappInviteSchema } from "@/lib/volei/whatsapp";

export async function saveWhatsAppGroup(input: string): Promise<{ error: string }> {
  const { client } = await requireVoleiAdmin();
  const parsed = whatsappInviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data, error } = await client.from("volei_group_settings")
    .update({ whatsapp_invite_url: parsed.data }).eq("id", true)
    .select("whatsapp_invite_url").maybeSingle();
  if (error || !data) return { error: "Não foi possível salvar o link do grupo. Confira se a atualização do banco foi aplicada e tente novamente." };
  revalidatePath("/volei", "layout");
  revalidatePath("/admin/volei", "layout");
  return { error: "" };
}

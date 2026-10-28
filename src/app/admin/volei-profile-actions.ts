"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { saveProfilePhoto } from "@/lib/volei/photos";
import { phoneSchema } from "@/lib/volei/phone";

function refresh() {
  revalidatePath("/admin/volei", "layout");
  revalidatePath("/volei", "layout");
}
export async function saveSkillLevel(
  id: string,
  guest: boolean,
  level: number | null,
) {
  const { client } = await requireVoleiAdmin();
  if (
    !z.uuid().safeParse(id).success ||
    typeof guest !== "boolean" ||
    !z.number().int().min(1).max(5).nullable().safeParse(level).success
  )
    return { error: "Nível inválido." };
  const { error } = await client
    .from(guest ? "volei_guests" : "volei_members")
    .update({ skill_level: level })
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar o nível." };
  refresh();
  return { error: "" };
}
async function saveAdminProfile(
  table: "volei_members" | "volei_guests",
  id: string,
  form: FormData,
) {
  const { client } = await requireVoleiAdmin();
  if (!z.uuid().safeParse(id).success) return { error: "Cadastro inválido." };
  const { data, error } = await client
    .from(table)
    .select("id,photo_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { error: "Cadastro não encontrado." };
  const result = await saveProfilePhoto(client, table, data, form);
  if (!result.error) refresh();
  return result;
}
export async function saveAdminMemberProfile(id: string, form: FormData) {
  return saveAdminProfile("volei_members", id, form);
}
export async function saveAdminGuestProfile(id: string, form: FormData) {
  return saveAdminProfile("volei_guests", id, form);
}
export async function saveGuestPhone(id: string, input: unknown) {
  const { client } = await requireVoleiAdmin();
  const parsed = phoneSchema.safeParse(input);
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return { error: "Informe um telefone válido." };
  const { error } = await client
    .from("volei_guests")
    .update({ phone: parsed.data })
    .eq("id", id);
  if (error)
    return {
      error:
        "Não foi possível atualizar. Verifique se o convidado está bloqueado.",
    };
  refresh();
  return { error: "" };
}
export async function setGuestBlocked(
  id: string,
  blocked: boolean,
  reason: string,
) {
  const { client } = await requireVoleiAdmin();
  if (
    !z.uuid().safeParse(id).success ||
    typeof blocked !== "boolean" ||
    typeof reason !== "string" ||
    reason.length > 200
  )
    return { error: "Dados inválidos." };
  const { data, error } = await client
    .from("volei_guests")
    .select("phone")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.phone)
    return { error: "Preencha o telefone do convidado antes de bloquear." };
  const result = await client.rpc("volei_set_guest_block", {
    p_phone: data.phone,
    p_blocked: blocked,
    p_reason: reason,
  });
  if (result.error)
    return {
      error:
        result.error.code === "P0001"
          ? result.error.message
          : "Não foi possível alterar o bloqueio.",
    };
  refresh();
  return { error: "" };
}

"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireVoleiAdmin } from "@/lib/volei/auth";
export async function readComplaint(id: string) {
  const { client } = await requireVoleiAdmin();
  if (!z.uuid().safeParse(id).success) return { error: "Relato inválido." };
  const { error } = await client.rpc("volei_read_complaint", { p_id: id });
  return { error: error ? "Não foi possível marcar a leitura." : "" };
}
export async function reviewComplaint(input: unknown) {
  const { client } = await requireVoleiAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(["open", "in_review", "resolved"]),
      note: z.string().trim().max(2000),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do atendimento." };
  const { id, status, note } = parsed.data;
  const { error } = await client.rpc("volei_review_complaint", {
    p_id: id,
    p_status: status,
    p_note: note,
  });
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Não foi possível atualizar o atendimento.",
    };
  revalidatePath("/admin/volei", "layout");
  return { error: "" };
}

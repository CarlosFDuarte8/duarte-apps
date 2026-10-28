"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { savePublicAttendance } from "@/lib/volei/repository";
import { today } from "@/lib/volei/domain";

export async function respond(
  token: string,
  eventId: string,
  status: "confirmado" | "nao_vai" | "limpar",
) {
  const parsed = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      eventId: z.uuid(),
      status: z.enum(["confirmado", "nao_vai", "limpar"]),
    })
    .safeParse({ token, eventId, status });
  if (!parsed.success) return { error: "Link inválido." };
  const result = await savePublicAttendance(token, eventId, status, today());
  if (!result.error) {
    revalidatePath("/volei/[token]", "page");
    revalidatePath("/admin/volei", "layout");
  }
  return result;
}

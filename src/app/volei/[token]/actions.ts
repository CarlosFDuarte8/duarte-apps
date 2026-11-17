"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { savePublicAttendance } from "@/lib/volei/repository";
import { today } from "@/lib/volei/domain";
import { requiredBirthDateSchema } from "@/lib/volei/profile";

export async function respond(
  token: string,
  eventId: string,
  status: "confirmado" | "nao_vai" | "limpar",
  birthDate?: string,
) {
  const parsed = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      eventId: z.uuid(),
      status: z.enum(["confirmado", "nao_vai", "limpar"]),
      birthDate: requiredBirthDateSchema.optional(),
    })
    .safeParse({ token, eventId, status, birthDate });
  if (!parsed.success) return { error: "Link inválido." };
  const result = await savePublicAttendance(token, eventId, status, today(), parsed.data.birthDate);
  if (!result.error) {
    revalidatePath("/volei/[token]", "page");
    revalidatePath("/admin/volei", "layout");
  }
  return result;
}

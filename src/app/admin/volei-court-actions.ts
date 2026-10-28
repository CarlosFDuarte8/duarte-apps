"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { mutateCourt } from "@/lib/volei/court-repository";
const key = z.string().regex(/^[mg]:[a-f0-9-]{36}$/);
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["arrive", "leave", "undo"]), key }),
  z.object({ type: z.literal("shuffle") }),
  z.object({
    type: z.literal("point"),
    team: z.number().int().min(0).max(3),
    delta: z.union([z.literal(1), z.literal(-1)]),
  }),
  z.object({
    type: z.literal("clock"),
    command: z.enum(["start", "pause", "reset"]),
  }),
  z.object({ type: z.literal("winner"), team: z.number().int().min(0).max(3) }),
  z.object({ type: z.literal("swap"), first: key, second: key }),
]);
export async function manageCourt(input: unknown) {
  const { client } = await requireVoleiAdmin();
  const parsed = z
    .object({
      eventId: z.uuid(),
      version: z.number().int().min(0),
      action: actionSchema,
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Dados da quadra inválidos." };
  const result = await mutateCourt(
    client,
    parsed.data.eventId,
    parsed.data.action,
    parsed.data.version,
  );
  if (!result.error) {
    revalidatePath("/admin/volei", "layout");
    revalidatePath("/volei", "layout");
  }
  return result;
}
export async function setCourtCapacity(eventId: string, teams: 3 | 4) {
  const { client } = await requireVoleiAdmin();
  if (!z.uuid().safeParse(eventId).success || ![3, 4].includes(teams))
    return { error: "Quantidade de times inválida." };
  const { error } = await client
    .from("volei_events")
    .update({ max_teams: teams })
    .eq("id", eventId);
  if (error)
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Não foi possível alterar a capacidade.",
    };
  revalidatePath("/admin/volei", "layout");
  revalidatePath("/volei", "layout");
  return { error: "" };
}

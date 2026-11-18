"use server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { studentClassSchema } from "@/lib/volei/students";
import { revalidatePath } from "next/cache";
import { serviceClient } from "@/lib/escalas/supabase";
import {
  bindDevice,
  deviceSecret,
  hashDevice,
} from "@/lib/volei/player-session";
import { phoneSchema } from "@/lib/volei/phone";
import { currentPlayer } from "@/lib/volei/player-session";
import { deleteStoredPhotos } from "@/lib/volei/photos";
import { duplicateMemberMessage, requiredBirthDateSchema } from "@/lib/volei/profile";
const guestSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome do convidado.")
  .max(100);
function refresh() {
  revalidatePath("/volei", "layout");
  revalidatePath("/admin/volei", "layout");
}
function errorMessage(error: { code?: string; message: string }) {
  if (error.code === "P0001") return error.message;
  if (error.code === "23505")
    return duplicateMemberMessage;
  return "Não foi possível registrar agora. Tente novamente em instantes.";
}
export async function registerForGame(
  input: unknown,
): Promise<{ error: string }> {
  const parsed = z
    .object({
      enrollment: studentClassSchema,
      eventId: z.uuid(),
      name: z.string().trim().min(2, "Informe seu nome completo.").max(100),
      phone: phoneSchema,
      birthDate: requiredBirthDateSchema,
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ?? "Confira os dados da inscrição.",
    };
  const secret = (await deviceSecret()) ?? randomBytes(32).toString("hex");
  const { eventId, name, phone, enrollment, birthDate } = parsed.data;
  const { error } = await serviceClient().rpc(
    "volei_register_participation_profile",
    {
      p_event: eventId,
      p_name: name,
      p_phone: phone,
      p_secret_hash: hashDevice(secret),
      p_days: enrollment.days,
      p_class_time: enrollment.classTime,
      p_birth_date: birthDate,
    },
  );
  if (error) return { error: errorMessage(error) };
  await bindDevice(secret);
  refresh();
  return { error: "" };
}
export async function manageGame(input: unknown): Promise<{ error: string }> {
  const parsed = z
    .object({
      eventId: z.uuid(),
      action: z.enum(["join", "cancel", "guest_join", "guest_cancel"]),
      guest: guestSchema.optional(),
      guestPhone: phoneSchema.optional(),
      birthDate: requiredBirthDateSchema.optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Confira os dados da solicitação." };
  const secret = await deviceSecret();
  if (!secret)
    return {
      error:
        "Use o mesmo navegador em que você se inscreveu para gerenciar sua presença.",
    };
  const { eventId, action, guest, guestPhone, birthDate } = parsed.data;
  if (action === "guest_join") {
    if (!guest || !guestPhone)
      return { error: "Informe o nome e o telefone do convidado." };
    const player = await currentPlayer();
    const previous = player
      ? await serviceClient()
          .from("volei_guests")
          .select("photo_path")
          .eq("event_id", eventId)
          .eq("member_id", player.id)
          .maybeSingle()
      : null;
    const result = await serviceClient().rpc("volei_add_phone_guest", {
      p_event: eventId,
      p_secret_hash: hashDevice(secret),
      p_name: guest,
      p_phone: guestPhone,
    });
    if (result.error) return { error: errorMessage(result.error) };
    await deleteStoredPhotos([previous?.data?.photo_path]);
    refresh();
    return { error: "" };
  }
  const { error } = await serviceClient().rpc("volei_phone_manage_profile", {
    p_event: eventId,
    p_secret_hash: hashDevice(secret),
    p_action: action,
    p_guest_name: guest ?? null,
    p_birth_date: birthDate ?? null,
  });
  if (error) return { error: errorMessage(error) };
  refresh();
  return { error: "" };
}

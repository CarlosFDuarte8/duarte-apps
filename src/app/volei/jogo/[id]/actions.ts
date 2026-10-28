"use server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serviceClient } from "@/lib/escalas/supabase";
import {
  DEVICE_COOKIE,
  deviceSecret,
  hashDevice,
} from "@/lib/volei/player-session";
import { phoneSchema } from "@/lib/volei/phone";
import { currentPlayer } from "@/lib/volei/player-session";
import { deleteStoredPhotos } from "@/lib/volei/photos";
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
    return "Este telefone ou navegador já possui um cadastro. Use o acesso original ou fale com o responsável.";
  return "Não foi possível registrar agora. Tente novamente em instantes.";
}
export async function registerForGame(
  input: unknown,
): Promise<{ error: string }> {
  const parsed = z
    .object({
      eventId: z.uuid(),
      name: z.string().trim().min(2, "Informe seu nome completo.").max(100),
      phone: phoneSchema,
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ?? "Confira os dados da inscrição.",
    };
  const secret = (await deviceSecret()) ?? randomBytes(32).toString("hex");
  const { eventId, name, phone } = parsed.data;
  const { error } = await serviceClient().rpc("volei_phone_register", {
    p_event: eventId,
    p_name: name,
    p_phone: phone,
    p_secret_hash: hashDevice(secret),
    p_guest_name: null,
  });
  if (error) return { error: errorMessage(error) };
  (await cookies()).set(DEVICE_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/volei",
    maxAge: 60 * 60 * 24 * 365,
  });
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
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Confira os dados da solicitação." };
  const secret = await deviceSecret();
  if (!secret)
    return {
      error:
        "Use o mesmo navegador em que você se inscreveu para gerenciar sua presença.",
    };
  const { eventId, action, guest, guestPhone } = parsed.data;
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
  const { error } = await serviceClient().rpc("volei_phone_manage", {
    p_event: eventId,
    p_secret_hash: hashDevice(secret),
    p_action: action,
    p_guest_name: guest ?? null,
  });
  if (error) return { error: errorMessage(error) };
  refresh();
  return { error: "" };
}

export async function identifyByPhone(
  input: unknown,
): Promise<{ error: string; found: boolean }> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Celular inválido.",
      found: false,
    };
  const secret = (await deviceSecret()) ?? randomBytes(32).toString("hex");
  const { data, error } = await serviceClient().rpc("volei_phone_identify", {
    p_phone: parsed.data,
    p_secret_hash: hashDevice(secret),
  });
  if (error) return { error: errorMessage(error), found: false };
  (await cookies()).set(DEVICE_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/volei",
    maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
  return { error: "", found: !!data };
}

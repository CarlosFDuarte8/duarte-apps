"use server";
import { revalidatePath } from "next/cache";
import {
  currentPlayer,
  deviceSecret,
  hashDevice,
} from "@/lib/volei/player-session";
import { serviceClient } from "@/lib/escalas/supabase";
import { saveProfilePhoto } from "@/lib/volei/photos";
import { guestByProfileToken } from "@/lib/volei/repository";

function refresh() {
  revalidatePath("/volei", "layout");
  revalidatePath("/admin/volei", "layout");
}
export async function saveOwnProfile(form: FormData) {
  const player = await currentPlayer();
  const secret = await deviceSecret();
  if (!player || !secret)
    return {
      error:
        "Identifique seu telefone no link do jogo para acessar seu cadastro.",
    };
  const result = await saveProfilePhoto(
    serviceClient(),
    "volei_members",
    player,
    form,
    { column: "device_secret_hash", value: hashDevice(secret) },
  );
  if (!result.error) refresh();
  return result;
}
export async function saveGuestProfile(token: string, form: FormData) {
  const guest = await guestByProfileToken(token);
  if (!guest) return { error: "Este convite não está mais disponível." };
  const result = await saveProfilePhoto(
    serviceClient(),
    "volei_guests",
    guest,
    form,
    { column: "profile_token", value: token },
  );
  if (!result.error) refresh();
  return result;
}

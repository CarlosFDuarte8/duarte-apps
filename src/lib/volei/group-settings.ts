import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { configured, serviceClient } from "@/lib/escalas/supabase";
import { whatsappInviteSchema, type WhatsAppGroupInfo } from "./whatsapp";

export async function readGroupSettings(client: SupabaseClient) {
  const { data, error } = await client.from("volei_group_settings")
    .select("whatsapp_invite_url").eq("id", true).maybeSingle();
  if (error) {
    // The optional invitation must not take existing pages offline before migration.
    if (error.code === "PGRST205" || error.code === "42P01") return { ready: false, url: null };
    throw new Error("Não foi possível carregar as configurações do grupo.");
  }
  const parsed = whatsappInviteSchema.safeParse(data?.whatsapp_invite_url ?? "");
  return { ready: !!data, url: parsed.success ? parsed.data : null };
}

export async function groupInviteInfo(url: string | null): Promise<WhatsAppGroupInfo | null> {
  if (!url) return null;
  return {
    url,
    qrCode: await QRCode.toDataURL(url, { width: 512, margin: 4, errorCorrectionLevel: "M" }),
  };
}

export const publicWhatsAppGroup = cache(async () => {
  if (!configured()) return null;
  const { url } = await readGroupSettings(serviceClient());
  return groupInviteInfo(url);
});

import { z } from "zod";

export const whatsappInviteSchema = z.string().trim().max(500, "O link deve ter no máximo 500 caracteres.").transform((value, ctx) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" && url.hostname === "chat.whatsapp.com" &&
      !url.username && !url.password && !url.port &&
      /^\/[A-Za-z0-9]{1,128}\/?$/.test(url.pathname)
    ) {
      return `https://chat.whatsapp.com/${url.pathname.replaceAll("/", "")}`;
    }
  } catch { /* The same message covers malformed URLs and other domains. */ }
  ctx.addIssue({ code: "custom", message: "Cole o link de convite do grupo: https://chat.whatsapp.com/…" });
  return z.NEVER;
});

export type WhatsAppGroupInfo = { url: string; qrCode: string };

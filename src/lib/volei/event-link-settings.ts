import { z } from "zod";

export function validDirectionsURL(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const eventLinkSettingsSchema = z.object({
  calendar_enabled: z.boolean().default(false),
  directions_enabled: z.boolean().default(false),
  directions_url: z.string().trim().max(2048).nullish()
    .transform(value => value || null)
    .refine(value => !value || validDirectionsURL(value), "Informe um link HTTPS válido para o local, sem usuário ou senha."),
}).refine(value => !value.directions_enabled || !!value.directions_url, {
  message: "Informe o link do local para exibir o botão de rota.", path: ["directions_url"],
});

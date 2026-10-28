"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/escalas/supabase";
export async function loginVolei(_state: string, form: FormData) {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(200) })
    .safeParse({
      email: String(form.get("email") ?? "").trim(),
      password: form.get("password"),
    });
  if (!parsed.success) return "Informe e-mail e senha válidos.";
  const client = await sessionClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return "Não foi possível entrar. Confira seu e-mail e senha.";
  const { data: owner, error: permissionError } =
    await client.rpc("is_volei_admin");
  if (permissionError || !owner)
    return "Esta conta não tem acesso ao painel do vôlei. Verifique a permissão de responsável no Supabase.";
  redirect("/admin/volei");
}
export async function logoutVolei() {
  const client = await sessionClient();
  await client.auth.signOut();
  redirect("/volei/entrar");
}

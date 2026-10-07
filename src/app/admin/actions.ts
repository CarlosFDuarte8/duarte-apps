"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertPublishable,
  generate,
  memberSchema,
  monthSchema,
  periodSchema,
  ruleSchema,
  dependencySchema,
  categorySchema,
  validatePeriod,
  today,
} from "@/lib/escalas/domain";
import { commit, history, snapshot } from "@/lib/escalas/repository";
import { sessionClient } from "@/lib/escalas/supabase";

export async function login(input: unknown) {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(200) })
    .safeParse(input);
  if (!parsed.success) return { error: "Informe e-mail e senha válidos." };
  const client = await sessionClient();
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error:
        "Não foi possível entrar. Confira suas credenciais e tente novamente.",
    };
  redirect("/admin");
}
export async function logout() {
  const client = await sessionClient();
  await client.auth.signOut();
  redirect("/admin/login");
}
export async function mutate(
  kind: "member" | "rules" | "generate" | "period",
  input: unknown,
  revision: number,
) {
  // Fora do catch: redirects de autorização não podem ser convertidos em sucesso/erro de formulário.
  const state = await snapshot();
  try {
    if (revision !== state.revision)
      throw new Error("Os dados mudaram. Recarregue a página antes de salvar.");
    let destination = "";
    if (kind === "member") {
      const member = memberSchema.parse(input);
      const context = {
        ...state,
        members: [...state.members.filter((m) => m.id !== member.id), member],
      };
      for (const p of state.periods.filter(
        (p) => p.status === "published" && p.month >= today().slice(0, 7),
      ))
        assertPublishable(p, context);
      await commit(revision, state.actor, "member", member);
      destination = `/admin/membros/${member.id}`;
    } else if (kind === "rules") {
      const rules = z
        .object({ rules: ruleSchema, dependencies: z.array(dependencySchema) })
        .parse(input);
      for (const d of rules.dependencies) {
        const trigger = state.members.find((m) => m.id === d.trigger_member);
        const target = state.members.find((m) => m.id === d.required_member);
        if (
          !trigger ||
          !target ||
          !d.trigger_roles.every((r) => trigger.allowed_roles.includes(r)) ||
          !target.allowed_roles.includes(d.required_role)
        )
          throw new Error("O vínculo contém membros ou funções incompatíveis.");
      }
      for (const p of state.periods.filter(
        (p) => p.status === "published" && p.month >= today().slice(0, 7),
      ))
        assertPublishable(p, { ...state, ...rules });
      await commit(revision, state.actor, "rules", rules);
    } else if (kind === "generate") {
      const args = z
        .object({
          start: monthSchema,
          end: monthSchema,
          categories: z.array(categorySchema).min(1),
        })
        .parse(input);
      if (
        state.periods.some((p) => p.month >= args.start && p.month <= args.end)
      )
        throw new Error(
          "Já existe escala no intervalo. Edite os meses existentes ou escolha meses ainda não gerados.",
        );
      const result = generate(
        args.start,
        args.end,
        args.categories,
        state,
        history(state.periods),
      );
      await commit(revision, state.actor, "periods", result);
      destination = `/admin/escalas/${result.periods[0].id}`;
    } else if (kind === "period") {
      const period = periodSchema.parse(input);
      const existing = state.periods.find((p) => p.id === period.id);
      if (
        !existing ||
        existing.month !== period.month ||
        JSON.stringify(existing.categories) !==
          JSON.stringify(period.categories)
      )
        throw new Error("Período inválido.");
      if (
        existing.events.length !== period.events.length ||
        existing.events.some(
          (e) =>
            !period.events.some(
              (n) => n.id === e.id && n.date === e.date && n.kind === e.kind,
            ),
        )
      )
        throw new Error(
          "A estrutura dos eventos não pode ser alterada no editor.",
        );
      if (period.status === "published") assertPublishable(period, state);
      await commit(revision, state.actor, "periods", {
        periods: [period],
        conflicts: validatePeriod(period, state),
      });
    } else {
      throw new Error("Operação desconhecida.");
    }
    revalidatePath("/admin", "layout");
    revalidatePath("/escalas", "layout");
    return { ok: true, destination };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues.map((i) => i.message).join("; ")
          : error instanceof Error
            ? error.message
            : "Não foi possível salvar.",
    };
  }
}

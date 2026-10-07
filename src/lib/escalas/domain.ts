import { z } from "zod";
import { randomUUID } from "./uuid";

export const categories = ["porteiro", "porteira", "organista"] as const;
export const categorySchema = z.enum(categories);
export type Category = z.infer<typeof categorySchema>;
export const roles = [
  "primeiro",
  "segundo",
  "porteira",
  "meia_hora",
  "culto",
  "jovens_porteiro",
  "jovens_porteira",
  "jovens_organista",
  "ensaio_porteiro",
  "ensaio_porteira",
  "ensaio_organista",
] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;
export const labels: Record<Role, string> = {
  primeiro: "1º porteiro",
  segundo: "2º porteiro",
  porteira: "Porteira",
  meia_hora: "Meia hora",
  culto: "Organista do culto",
  jovens_porteiro: "Porteiro · jovens",
  jovens_porteira: "Porteira · jovens",
  jovens_organista: "Organista · jovens",
  ensaio_porteiro: "Porteiro · ensaio",
  ensaio_porteira: "Porteira · ensaio",
  ensaio_organista: "Organista · ensaio",
};
export function categoryOf(role: Role): Category {
  return role === "primeiro" || role === "segundo" || role.endsWith("_porteiro")
    ? "porteiro"
    : role === "porteira" || role.endsWith("_porteira")
      ? "porteira"
      : "organista";
}
export const dateSchema = z.iso.date();
export const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const memberSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(2).max(100),
    phone: z.string().max(40),
    category: categorySchema,
    is_active: z.boolean(),
    joined_on: dateSchema.nullable(),
    notes: z.string().max(2000),
    unavailable_weekdays: z.array(z.number().int().min(0).max(6)),
    unavailable_dates: z.array(dateSchema),
    allowed_roles: z.array(roleSchema).min(1),
  })
  .refine(
    (m) => m.allowed_roles.every((r) => categoryOf(r) === m.category),
    "As funções devem pertencer à categoria do membro.",
  );
export type Member = z.infer<typeof memberSchema>;
export const dependencySchema = z
  .object({
    id: z.uuid(),
    trigger_member: z.uuid(),
    trigger_roles: z.array(roleSchema).min(1),
    required_member: z.uuid(),
    required_role: roleSchema,
    exclusive: z.boolean(),
    enabled: z.boolean(),
  })
  .refine(
    (d) => d.trigger_member !== d.required_member,
    "Selecione membros diferentes.",
  );
export type Dependency = z.infer<typeof dependencySchema>;
export const ruleSchema = z.object({
  official_weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  youth_weekday: z.number().int().min(0).max(6),
  rehearsal_weekday: z.number().int().min(0).max(6),
  rehearsal_categories: z.array(categorySchema),
  avoid_consecutive: z.boolean(),
  allow_same_organist: z.boolean(),
});
export type Rules = z.infer<typeof ruleSchema>;
export const eventSchema = z.object({
  id: z.uuid(),
  date: dateSchema,
  kind: z.enum(["culto", "jovens", "ensaio"]),
  notes: z.string().max(2000),
  assignments: z.array(z.object({ role: roleSchema, member_id: z.uuid() })),
});
export type Event = z.infer<typeof eventSchema>;
// Ordem dos eventos no mesmo dia: jovens, ensaio e depois o culto.
export const KIND_ORDER = ["jovens", "ensaio", "culto"];
export function compareEvents(
  a: { date: string; kind: string },
  b: { date: string; kind: string },
) {
  return (
    a.date.localeCompare(b.date) ||
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  );
}
export const periodSchema = z.object({
  id: z.uuid(),
  month: monthSchema,
  status: z.enum(["draft", "published"]),
  categories: z.array(categorySchema).min(1),
  events: z.array(eventSchema),
});
export type Period = z.infer<typeof periodSchema>;
export type Conflict = {
  date: string;
  category: string;
  rule: string;
  solutions: string;
};
export type Context = {
  members: Member[];
  dependencies: Dependency[];
  rules: Rules;
};
export const defaultRules: Rules = {
  official_weekdays: [5, 0],
  youth_weekday: 0,
  rehearsal_weekday: 2,
  rehearsal_categories: ["porteiro"],
  avoid_consecutive: true,
  allow_same_organist: true,
};
export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function shiftMonth(month: string, amount: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + amount, 1)).toISOString().slice(0, 7);
}
/** Meses de `start` a `end` (inclusive). Vazio se o intervalo for inválido; corta em `limit + 1` itens. */
export function monthRange(start: string, end: string, limit = 24) {
  const months: string[] = [];
  if (!monthSchema.safeParse(start).success || !monthSchema.safeParse(end).success)
    return months;
  for (let m = start; m <= end && months.length <= limit; m = shiftMonth(m, 1))
    months.push(m);
  return months;
}
/** Primeiro mês a partir de `from` que ainda não está em `taken`. */
export function firstFreeMonth(from: string, taken: string[]) {
  let month = from;
  while (taken.includes(month)) month = shiftMonth(month, 1);
  return month;
}
/** Funções esperadas nos eventos e quantas já têm alguém atribuído. */
export function slotProgress(events: Event[], cats: Category[], rules: Rules) {
  let total = 0;
  let filled = 0;
  for (const event of events) {
    const slots = eventRoles(event.kind, cats, rules);
    total += slots.length;
    filled += slots.filter((r) =>
      event.assignments.some((a) => a.role === r),
    ).length;
  }
  return { total, filled };
}
export function eventRoles(
  kind: Event["kind"],
  cats: Category[],
  rules: Rules,
): Role[] {
  return roles.filter(
    (r) =>
      cats.includes(categoryOf(r)) &&
      (kind === "culto"
        ? !r.includes("_") || r === "meia_hora"
        : r.startsWith(`${kind}_`)) &&
      (kind !== "ensaio" || rules.rehearsal_categories.includes(categoryOf(r))),
  );
}
export function eligible(m: Member, role: Role, date: string) {
  return (
    m.is_active &&
    (!m.joined_on || m.joined_on <= date) &&
    m.category === categoryOf(role) &&
    m.allowed_roles.includes(role) &&
    !m.unavailable_weekdays.includes(weekday(date)) &&
    !m.unavailable_dates.includes(date)
  );
}
export function calendar(
  month: string,
  cats: Category[],
  rules: Rules,
): Event[] {
  monthSchema.parse(month);
  const result: Event[] = [];
  for (let day = 1; day <= 31; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (!dateSchema.safeParse(date).success) continue;
    const w = weekday(date);
    const kinds: Event["kind"][] = [];
    if (rules.official_weekdays.includes(w)) kinds.push("culto");
    if (w === rules.youth_weekday) kinds.push("jovens");
    if (day <= 7 && w === rules.rehearsal_weekday) kinds.push("ensaio");
    for (const kind of kinds)
      if (eventRoles(kind, cats, rules).length)
        result.push({
          id: randomUUID(),
          date,
          kind,
          notes: "",
          assignments: [],
        });
  }
  return result;
}
function dependencyErrors(
  event: Event,
  ctx: Context,
  partial = false,
): Conflict[] {
  const errors: Conflict[] = [];
  for (const d of ctx.dependencies.filter((d) => d.enabled)) {
    const triggered = event.assignments.some(
      (a) =>
        a.member_id === d.trigger_member && d.trigger_roles.includes(a.role),
    );
    const target = event.assignments.find((a) => a.role === d.required_role);
    const relevant = eventRoles(
      event.kind,
      [...categories],
      ctx.rules,
    ).includes(d.required_role);
    if (!relevant) continue;
    if (
      (triggered &&
        (!partial || target) &&
        target?.member_id !== d.required_member) ||
      (!triggered &&
        !partial &&
        d.exclusive &&
        target?.member_id === d.required_member)
    ) {
      const name = (id: string) =>
        ctx.members.find((m) => m.id === id)?.name ?? id;
      errors.push({
        date: event.date,
        category: categoryOf(d.required_role),
        rule: `${name(d.trigger_member)} exige ${name(d.required_member)} em ${labels[d.required_role]}${d.exclusive ? " (vínculo exclusivo)" : ""}.`,
        solutions:
          "Ajuste as duas atribuições ou revise o vínculo e a disponibilidade.",
      });
    }
  }
  return errors;
}
export function validateEvent(
  event: Event,
  cats: Category[],
  ctx: Context,
): Conflict[] {
  const errors: Conflict[] = [];
  const required = eventRoles(event.kind, cats, ctx.rules);
  const add = (role: string, rule: string) =>
    errors.push({
      date: event.date,
      category: role,
      rule,
      solutions:
        "Escolha um membro elegível ou ajuste o cadastro/regra antes de publicar.",
    });
  for (const role of required)
    if (event.assignments.filter((a) => a.role === role).length !== 1)
      add(
        categoryOf(role),
        `${labels[role]} precisa de exatamente uma pessoa.`,
      );
  for (const a of event.assignments) {
    const m = ctx.members.find((m) => m.id === a.member_id);
    if (!required.includes(a.role))
      add(categoryOf(a.role), "Função não prevista para o evento/categoria.");
    if (!m || !eligible(m, a.role, event.date))
      add(
        categoryOf(a.role),
        `${m?.name ?? "Membro desconhecido"}: inativo, indisponível ou sem permissão para ${labels[a.role]}.`,
      );
    if (
      event.assignments.some(
        (b) =>
          b !== a &&
          b.member_id === a.member_id &&
          !(
            ctx.rules.allow_same_organist &&
            [a.role, b.role].every((r) => r === "culto" || r === "meia_hora")
          ),
      )
    )
      add(
        categoryOf(a.role),
        "Uma pessoa não pode ocupar funções incompatíveis no mesmo evento.",
      );
  }
  return [...errors, ...dependencyErrors(event, ctx)];
}
export function validatePeriod(period: Period, ctx: Context): Conflict[] {
  const expected = calendar(period.month, period.categories, ctx.rules);
  const errors = period.events.flatMap((e) =>
    validateEvent(e, period.categories, ctx),
  );
  for (const e of expected)
    if (
      period.events.filter((x) => x.date === e.date && x.kind === e.kind)
        .length !== 1
    )
      errors.push({
        date: e.date,
        category: "evento",
        rule: `É necessário exatamente um evento: ${e.kind}.`,
        solutions: "Gere novamente o mês ou complete a importação.",
      });
  for (const e of period.events)
    if (!expected.some((x) => x.date === e.date && x.kind === e.kind))
      errors.push({
        date: e.date,
        category: "evento",
        rule: "Evento fora do calendário configurado.",
        solutions: "Revise a data ou a configuração.",
      });
  return errors;
}
export function assertPublishable(period: Period, ctx: Context) {
  const errors = validatePeriod(period, ctx);
  if (errors.length)
    throw new Error(
      `Publicação bloqueada: ${errors.length} conflito(s). ${errors[0].rule}`,
    );
}

/** Backtracking por evento: somente combinações completas que respeitam todos os vínculos são aceitas. */
export function generate(
  start: string,
  end: string,
  cats: Category[],
  ctx: Context,
  history: Event[] = [],
): { periods: Period[]; conflicts: Conflict[] } {
  monthSchema.parse(start);
  monthSchema.parse(end);
  if (end < start || end > shiftMonth(start, 11))
    throw new Error("Selecione de 1 a 12 meses em ordem crescente.");
  if (!cats.length) throw new Error("Selecione pelo menos uma categoria.");
  const counts = new Map<string, number>();
  const previous = new Map<string, Set<string>>();
  const count = (e: Event) => {
    for (const id of new Set(e.assignments.map((a) => a.member_id)))
      counts.set(id, (counts.get(id) ?? 0) + 1);
    previous.set(e.kind, new Set(e.assignments.map((a) => a.member_id)));
  };
  history
    .filter((e) => e.date < `${start}-01`)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(count);
  const periods: Period[] = [];
  const conflicts: Conflict[] = [];
  for (let month = start; month <= end; month = shiftMonth(month, 1)) {
    const events = calendar(month, cats, ctx.rules);
    for (const event of events) {
      const required = eventRoles(event.kind, cats, ctx.rules).sort((a, b) =>
        a === "culto" ? -1 : b === "culto" ? 1 : 0,
      );
      let attempts = 0;
      let exhausted = false;
      const search = (index: number): boolean => {
        if (++attempts > 100000) {
          exhausted = true;
          return false;
        }
        if (index === required.length)
          return validateEvent(event, cats, ctx).length === 0;
        const role = required[index];
        const candidates = ctx.members
          .filter((m) => eligible(m, role, event.date))
          .sort((a, b) => {
            const score = (m: Member) =>
              (counts.get(m.id) ?? 0) * 10 +
              (ctx.rules.avoid_consecutive &&
              previous.get(event.kind)?.has(m.id)
                ? 12
                : 0) -
              (role === "meia_hora" &&
              ctx.rules.allow_same_organist &&
              event.assignments.some(
                (x) => x.role === "culto" && x.member_id === m.id,
              )
                ? 5
                : 0);
            return score(a) - score(b) || a.name.localeCompare(b.name, "pt-BR");
          });
        for (const m of candidates) {
          if (
            event.assignments.some(
              (a) =>
                a.member_id === m.id &&
                !(
                  ctx.rules.allow_same_organist &&
                  [a.role, role].every(
                    (r) => r === "culto" || r === "meia_hora",
                  )
                ),
            )
          )
            continue;
          event.assignments.push({ role, member_id: m.id });
          if (!dependencyErrors(event, ctx, true).length && search(index + 1))
            return true;
          event.assignments.pop();
          if (exhausted) break;
        }
        return false;
      };
      if (!search(0))
        conflicts.push({
          date: event.date,
          category: cats.join(", "),
          rule: exhausted
            ? "Limite de busca atingido; nenhuma combinação confirmada."
            : "Não existe combinação válida para as disponibilidades e dependências.",
          solutions:
            "Inclua as categorias vinculadas, adicione membros disponíveis ou revise as restrições. Complete o rascunho manualmente.",
        });
      count(event);
    }
    const period: Period = {
      id: randomUUID(),
      month,
      status: "draft",
      categories: cats,
      events,
    };
    conflicts.push(...validatePeriod(period, ctx));
    periods.push(period);
  }
  return { periods, conflicts };
}

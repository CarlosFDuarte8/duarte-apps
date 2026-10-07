"use client";
import { useActionState, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow, useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { login, mutate } from "@/app/admin/actions";
import { randomUUID } from "@/lib/escalas/uuid";
import {
  CATEGORY_NAMES,
  KIND_NAMES,
  dayLabel,
  shortMonthLabel,
} from "@/components/escalas/admin-ui";
import {
  categories,
  roles,
  labels,
  categoryOf,
  compareEvents,
  memberSchema,
  monthSchema,
  categorySchema,
  shiftMonth,
  today,
  type Conflict,
  type Member,
  type Context,
  type Period,
  type Role,
  type Rules,
  type Dependency,
  validatePeriod,
  eligible,
} from "@/lib/escalas/domain";

const CULTO_ROLES: Role[] = [
  "primeiro",
  "segundo",
  "porteira",
  "meia_hora",
  "culto",
];
// Funções esperadas em cada evento, conforme as categorias do período e as regras de ensaio.
function eventSlots(
  event: Period["events"][number],
  periodCategories: Period["categories"],
  rules: Rules,
) {
  return roles.filter(
    (role) =>
      (role.startsWith(`${event.kind}_`) ||
        (event.kind === "culto" && CULTO_ROLES.includes(role))) &&
      periodCategories.includes(categoryOf(role)) &&
      (event.kind !== "ensaio" ||
        rules.rehearsal_categories.includes(categoryOf(role))),
  );
}

function useSave(revision: number) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(kind: Parameters<typeof mutate>[0], data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await mutate(kind, data, revision);
      if (result.error) setMessage(result.error);
      else {
        setMessage("Salvo com sucesso.");
        if (result.destination) router.push(result.destination);
        router.refresh();
      }
    } catch {
      setMessage("Falha na conexão. Recarregue e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return {
    save,
    busy,
    feedback: (
      <p
        className={`sc-feedback ${message === "Salvo com sucesso." ? "sc-feedback-ok" : "sc-feedback-error"}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    ),
  };
}
export function LoginForm() {
  const [error, submit, isSubmitting] = useActionState(
    async (_previousError: string, formData: FormData) => {
      try {
        const result = await login({
          email: String(formData.get("email") ?? "").trim(),
          password: String(formData.get("password") ?? ""),
        });
        return result.error;
      } catch (error) {
        // Preserve Next.js redirects while displaying request failures.
        unstable_rethrow(error);
        return "Não foi possível conectar. Tente novamente em instantes.";
      }
    },
    "",
  );
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form
      className="sc-form sc-login-form"
      aria-busy={isSubmitting}
      action={submit}
    >
      <div>
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="seu@email.com"
          required
          name="email"
        />
      </div>
      <div>
        <label htmlFor="login-password">Senha</label>
        <div className="sc-password-field">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            spellCheck={false}
            autoCapitalize="none"
            required
            name="password"
          />
          <button
            type="button"
            className="sc-password-toggle"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-controls="login-password"
            onClick={() => setShowPassword((value) => !value)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {showPassword ? (
                <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3.3 4.1M6.5 6.5A20 20 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.5-1.5" />
              ) : (
                <>
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
            <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
          </button>
        </div>
      </div>
      {error && !isSubmitting && (
        <p className="sc-login-error" role="alert">
          {error}
        </p>
      )}
      <button className="sc-login-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Acessar administração"}
        {!isSubmitting && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
export function MemberForm({
  member,
  revision,
}: {
  member?: Member;
  revision: number;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Member>({
    resolver: zodResolver(memberSchema),
    defaultValues: member ?? {
      id: "",
      name: "",
      phone: "",
      category: "porteiro",
      is_active: true,
      joined_on: null,
      notes: "",
      unavailable_dates: [],
      unavailable_weekdays: [],
      allowed_roles: roles.filter((r) => categoryOf(r) === "porteiro"),
    },
  });
  const { save, busy, feedback } = useSave(revision);
  const category = useWatch({ control, name: "category" });
  const weekdays = useWatch({ control, name: "unavailable_weekdays" });
  return (
    <form
      className="sc-form"
      onSubmit={(e) => {
        if (!member) setValue("id", randomUUID());
        void handleSubmit((values) => save("member", values))(e);
      }}
    >
      <section className="sc-card sc-form-card">
        <h2>Dados do membro</h2>
        <div className="sc-fields">
          <label>
            Nome
            <input {...register("name")} required maxLength={100} />
          </label>
          <label>
            Telefone (privado)
            <input {...register("phone")} type="tel" maxLength={40} />
          </label>
          <label>
            Categoria
            <select
              {...register("category", {
                onChange: (e) =>
                  setValue(
                    "allowed_roles",
                    roles.filter((r) => categoryOf(r) === e.target.value),
                  ),
              })}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_NAMES[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data de entrada
            <input
              type="date"
              {...register("joined_on", {
                setValueAs: (value) => value || null,
              })}
            />
          </label>
        </div>
        <label>
          Observações privadas
          <textarea {...register("notes")} maxLength={2000} />
        </label>
        <label className="sc-check">
          <input type="checkbox" {...register("is_active")} />
          Membro ativo
        </label>
      </section>
      <section className="sc-card sc-form-card">
        <h2>Disponibilidade</h2>
        <fieldset>
          <legend>Dias da semana indisponíveis</legend>
          {[
            "Domingo",
            "Segunda",
            "Terça",
            "Quarta",
            "Quinta",
            "Sexta",
            "Sábado",
          ].map((d, i) => (
            <label className="sc-check" key={d}>
              <input
                type="checkbox"
                checked={weekdays.includes(i)}
                onChange={(e) =>
                  setValue(
                    "unavailable_weekdays",
                    e.target.checked
                      ? [...weekdays, i]
                      : weekdays.filter((x) => x !== i),
                  )
                }
              />
              {d}
            </label>
          ))}
        </fieldset>
        <label>
          Datas indisponíveis (uma por linha, AAAA-MM-DD)
          <textarea
            defaultValue={member?.unavailable_dates.join("\n") ?? ""}
            onChange={(e) =>
              setValue(
                "unavailable_dates",
                e.target.value.split(/\s+/).filter(Boolean),
              )
            }
            placeholder="2026-12-25"
          />
        </label>
      </section>
      <section className="sc-card sc-form-card">
        <h2>Funções</h2>
        <fieldset>
          <legend>Funções permitidas</legend>
          {roles
            .filter((r) => categoryOf(r) === category)
            .map((r) => (
              <label className="sc-check" key={r}>
                <input
                  type="checkbox"
                  value={r}
                  {...register("allowed_roles")}
                />
                {labels[r]}
              </label>
            ))}
        </fieldset>
      </section>
      {Object.entries(errors).map(([field, error]) => (
        <p className="sc-form-error" role="alert" key={field}>
          {field}: {error.message ?? "Confira os valores informados."}
        </p>
      ))}
      <div className="sc-actions-bar sc-actions-sticky">
        <button className="sc-btn" disabled={busy}>
          {busy ? "Salvando…" : "Salvar membro"}
        </button>
        {feedback}
      </div>
      <p className="sc-muted">
        Vínculos são configurados em{" "}
        <Link href="/admin/regras">Regras e dependências</Link>. Inativação
        preserva o histórico; despublique escalas futuras afetadas antes de
        alterar o cadastro.
      </p>
    </form>
  );
}
const generationSchema = z.object({
  start: monthSchema,
  end: monthSchema,
  categories: z.array(categorySchema).min(1),
});
const MAX_MONTHS = 12;
function monthRange(start: string, end: string) {
  const months: string[] = [];
  if (!monthSchema.safeParse(start).success || !monthSchema.safeParse(end).success)
    return months;
  for (let m = start; m <= end && months.length <= 24; m = shiftMonth(m, 1))
    months.push(m);
  return months;
}
export function GenerationForm({
  revision,
  existingMonths,
}: {
  revision: number;
  existingMonths: string[];
}) {
  // Primeiro mês, a partir do atual, que ainda não tem escala.
  let first = today().slice(0, 7);
  while (existingMonths.includes(first)) first = shiftMonth(first, 1);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof generationSchema>>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      start: first,
      end: first,
      categories: [...categories],
    },
  });
  const { save, busy, feedback } = useSave(revision);
  const start = useWatch({ control, name: "start" });
  const end = useWatch({ control, name: "end" });
  const selected = useWatch({ control, name: "categories" });
  const months = monthRange(start, end);
  const clashes = months.filter((m) => existingMonths.includes(m));
  const problem = !months.length
    ? "O mês final deve ser igual ou posterior ao inicial."
    : months.length > MAX_MONTHS
      ? `Escolha no máximo ${MAX_MONTHS} meses por vez.`
      : clashes.length
        ? `Já existe escala em ${clashes.map(shortMonthLabel).join(", ")}. Escolha meses ainda não gerados.`
        : "";
  const presets = [
    { count: 1, label: "Próximo mês livre" },
    { count: 3, label: "3 meses" },
    { count: 6, label: "6 meses" },
    { count: 12, label: "12 meses" },
  ];
  return (
    <form
      className="sc-form"
      onSubmit={handleSubmit((v) => save("generate", v))}
    >
      <section className="sc-card sc-form-card">
        <h2>Período</h2>
        <div
          className="sc-presets"
          role="group"
          aria-label="Atalhos de período"
        >
          {presets.map((p) => (
            <button
              type="button"
              key={p.count}
              className="sc-chip sc-preset"
              aria-pressed={start === first && end === shiftMonth(first, p.count - 1)}
              onClick={() => {
                setValue("start", first);
                setValue("end", shiftMonth(first, p.count - 1));
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="sc-fields">
          <label>
            Mês inicial
            <input type="month" {...register("start")} required />
          </label>
          <label>
            Mês final
            <input type="month" {...register("end")} required />
          </label>
        </div>
        <div
          className={`sc-range-preview ${problem ? "is-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {problem ? (
            <strong>{problem}</strong>
          ) : (
            <>
              <strong>
                {months.length}{" "}
                {months.length === 1 ? "mês será gerado" : "meses serão gerados"}
              </strong>
              <ul className="sc-pills">
                {months.map((m) => (
                  <li key={m}>{shortMonthLabel(m)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
      <section className="sc-card sc-form-card">
        <h2>Categorias</h2>
        <fieldset>
          <legend>Quem entra na escala</legend>
          {categories.map((c) => (
            <label className="sc-check" key={c}>
              <input type="checkbox" value={c} {...register("categories")} />
              {CATEGORY_NAMES[c]}
            </label>
          ))}
        </fieldset>
        <p className="sc-muted">
          As escalas existentes não serão substituídas. Inclua as categorias dos
          membros vinculados para permitir combinações válidas.
        </p>
      </section>
      {Object.values(errors).map((e, i) => (
        <p className="sc-form-error" role="alert" key={i}>
          {e.message}
        </p>
      ))}
      <div className="sc-actions-bar sc-actions-sticky">
        <button
          className="sc-btn"
          disabled={busy || Boolean(problem) || selected.length === 0}
        >
          {busy ? "Gerando…" : "Gerar rascunhos"}
        </button>
        {feedback}
      </div>
    </form>
  );
}
export function ScheduleEditor({
  period,
  context,
  revision,
}: {
  period: Period;
  context: Context;
  revision: number;
}) {
  const [draft, setDraft] = useState(period);
  const [onlyIssues, setOnlyIssues] = useState(false);
  const router = useRouter();
  const { save, busy, feedback } = useSave(revision);
  const dirty = JSON.stringify(draft) !== JSON.stringify(period);
  function cancel() {
    if (dirty && !window.confirm("Descartar as alterações não salvas?")) return;
    router.push("/admin/escalas");
  }
  const conflicts = validatePeriod(draft, context);
  const sorted = [...draft.events].sort(compareEvents);
  const dates = [...new Set(sorted.map((e) => e.date))];
  const conflictsByDate = new Map<string, Conflict[]>();
  for (const c of conflicts)
    conflictsByDate.set(c.date, [...(conflictsByDate.get(c.date) ?? []), c]);
  const slotsOf = (event: Period["events"][number]) =>
    eventSlots(event, draft.categories, context.rules);
  const total = sorted.reduce((n, e) => n + slotsOf(e).length, 0);
  const filled = sorted.reduce(
    (n, e) =>
      n +
      slotsOf(e).filter((r) => e.assignments.some((a) => a.role === r)).length,
    0,
  );
  const percent = total ? Math.round((filled / total) * 100) : 100;
  const firstConflictDate = dates.find((d) => conflictsByDate.has(d));
  const visibleDates = onlyIssues
    ? dates.filter((d) => conflictsByDate.has(d))
    : dates;
  function assign(eventId: string, role: Role, memberId: string) {
    setDraft((prev) => ({
      ...prev,
      events: prev.events.map((ev) =>
        ev.id !== eventId
          ? ev
          : {
              ...ev,
              assignments: [
                ...ev.assignments.filter((a) => a.role !== role),
                ...(memberId ? [{ role, member_id: memberId }] : []),
              ],
            },
      ),
    }));
  }
  function setNotes(eventId: string, notes: string) {
    setDraft((prev) => ({
      ...prev,
      events: prev.events.map((ev) =>
        ev.id === eventId ? { ...ev, notes } : ev,
      ),
    }));
  }
  return (
    <>
      <section className="sc-card sc-editor-summary">
        <div className="sc-progress">
          <div className="sc-progress-head">
            <strong>
              {filled} de {total} funções preenchidas
            </strong>
            <span>{percent}%</span>
          </div>
          <div
            className="sc-progress-bar"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Funções preenchidas"
          >
            <i style={{ width: `${percent}%` }} />
          </div>
        </div>
        <p className="sc-muted">
          Revise as alterações antes de salvar. Observações dos eventos
          aparecem na escala pública. Cada salvamento registra autor e horário.
        </p>
        <label className="sc-check">
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={(e) => setOnlyIssues(e.target.checked)}
          />
          Mostrar só dias com conflitos
        </label>
      </section>
      {!visibleDates.length && (
        <div className="sc-card sc-notice sc-ok">
          <strong>Nenhum dia com conflitos.</strong>
          <p>Desmarque o filtro para ver todos os dias.</p>
        </div>
      )}
      {visibleDates.map((date) => {
        const events = sorted.filter((e) => e.date === date);
        const dayConflicts = conflictsByDate.get(date) ?? [];
        const dayTotal = events.reduce((n, e) => n + slotsOf(e).length, 0);
        const dayFilled = events.reduce(
          (n, e) =>
            n +
            slotsOf(e).filter((r) => e.assignments.some((a) => a.role === r))
              .length,
          0,
        );
        return (
          <section
            id={`dia-${date}`}
            className={`sc-card sc-day-card ${dayConflicts.length ? "has-conflict" : ""}`}
            key={date}
          >
            <header className="sc-day-card-head">
              <h2>{dayLabel(date)}</h2>
              <div className="sc-day-card-meta">
                {dayConflicts.length > 0 && (
                  <span className="sc-badge sc-badge-danger">
                    {dayConflicts.length}{" "}
                    {dayConflicts.length === 1 ? "conflito" : "conflitos"}
                  </span>
                )}
                <span
                  className={`sc-badge ${dayFilled === dayTotal ? "sc-badge-ok" : "sc-badge-warn"}`}
                >
                  {dayFilled}/{dayTotal} preenchidas
                </span>
              </div>
            </header>
            {dayConflicts.length > 0 && (
              <ul className="sc-day-conflicts" role="alert">
                {dayConflicts.map((c, i) => (
                  <li key={i}>
                    <strong>
                      {CATEGORY_NAMES[c.category as keyof typeof CATEGORY_NAMES] ??
                        "Evento"}
                    </strong>{" "}
                    {c.rule} <em>{c.solutions}</em>
                  </li>
                ))}
              </ul>
            )}
            {events.map((event) => (
              <div className="sc-event-block" key={event.id}>
                <h3>
                  <span
                    className={`sc-badge sc-kind-badge sc-kind-${event.kind}`}
                  >
                    {KIND_NAMES[event.kind] ?? event.kind}
                  </span>
                </h3>
                <div className="sc-slots">
                  {slotsOf(event).map((role) => {
                    const current =
                      event.assignments.find((a) => a.role === role)
                        ?.member_id ?? "";
                    return (
                      <label
                        className={`sc-slot sc-${categoryOf(role)}`}
                        key={role}
                      >
                        <span className="sc-slot-label">
                          <i aria-hidden="true" />
                          {labels[role]}
                        </span>
                        <select
                          value={current}
                          data-empty={!current}
                          onChange={(e) => assign(event.id, role, e.target.value)}
                        >
                          <option value="">Não atribuído</option>
                          {context.members
                            .filter(
                              (m) =>
                                eligible(m, role, event.date) ||
                                m.id === current,
                            )
                            .map((m) => (
                              <option
                                key={m.id}
                                value={m.id}
                                disabled={!eligible(m, role, event.date)}
                              >
                                {m.name}
                                {!eligible(m, role, event.date)
                                  ? " (indisponível/inativo)"
                                  : ""}
                              </option>
                            ))}
                        </select>
                      </label>
                    );
                  })}
                  <label className="sc-slot sc-slot-notes">
                    <span className="sc-slot-label">
                      Observação pública (opcional)
                    </span>
                    <textarea
                      rows={2}
                      value={event.notes}
                      maxLength={2000}
                      onChange={(e) => setNotes(event.id, e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </section>
        );
      })}
      <div className="sc-editor-bar">
        <div className="sc-bar-status" aria-live="polite">
          {conflicts.length ? (
            <a
              className="sc-status sc-status-bad"
              href={`#dia-${firstConflictDate}`}
            >
              <span aria-hidden="true">●</span> {conflicts.length}{" "}
              {conflicts.length === 1 ? "conflito" : "conflitos"} · publicação
              bloqueada
              <span className="sc-status-go"> Ver →</span>
            </a>
          ) : (
            <span className="sc-status sc-status-ok">
              <span aria-hidden="true">✓</span> Sem conflitos
            </span>
          )}
          {feedback}
        </div>
        <div className="sc-bar-actions">
          <button
            type="button"
            className="sc-btn"
            disabled={busy || conflicts.length > 0}
            onClick={() => save("period", { ...draft, status: "published" })}
          >
            Salvar e publicar
          </button>
          <button
            type="button"
            className="sc-btn sc-btn-ghost"
            disabled={busy}
            onClick={() => save("period", { ...draft, status: "draft" })}
          >
            {period.status === "published"
              ? "Despublicar e salvar"
              : "Salvar rascunho"}
          </button>
          <button
            type="button"
            className="sc-btn sc-btn-ghost"
            disabled={busy}
            onClick={cancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="sc-btn sc-btn-ghost sc-print"
            onClick={() => window.print()}
          >
            Imprimir / PDF
          </button>
        </div>
      </div>
    </>
  );
}
export function RulesForm({
  context,
  revision,
}: {
  context: Context;
  revision: number;
}) {
  const [rules, setRules] = useState<Rules>(context.rules);
  const [dependencies, setDependencies] = useState<Dependency[]>(
    context.dependencies,
  );
  const { save, busy, feedback } = useSave(revision);
  const days = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  function update(id: string, value: Partial<Dependency>) {
    setDependencies(
      dependencies.map((d) => (d.id === id ? { ...d, ...value } : d)),
    );
  }
  return (
    <form
      className="sc-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save("rules", { rules, dependencies });
      }}
    >
      <section className="sc-card sc-form-card">
        <h2>Cultos e reuniões</h2>
        <fieldset>
          <legend>Dias dos cultos oficiais</legend>
          {days.map((d, i) => (
            <label className="sc-check" key={d}>
              <input
                type="checkbox"
                checked={rules.official_weekdays.includes(i)}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    official_weekdays: e.target.checked
                      ? [...rules.official_weekdays, i]
                      : rules.official_weekdays.filter((n) => n !== i),
                  })
                }
              />
              {d}
            </label>
          ))}
        </fieldset>
        <div className="sc-fields">
          {(["youth_weekday", "rehearsal_weekday"] as const).map((key) => (
            <label key={key}>
              {key === "youth_weekday"
                ? "Reunião de jovens"
                : "Ensaio: primeira ocorrência do dia no mês"}
              <select
                value={rules[key]}
                onChange={(e) =>
                  setRules({ ...rules, [key]: Number(e.target.value) })
                }
              >
                {days.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <fieldset>
          <legend>Categorias no ensaio</legend>
          {categories.map((c) => (
            <label className="sc-check" key={c}>
              <input
                type="checkbox"
                checked={rules.rehearsal_categories.includes(c)}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    rehearsal_categories: e.target.checked
                      ? [...rules.rehearsal_categories, c]
                      : rules.rehearsal_categories.filter((x) => x !== c),
                  })
                }
              />
              {CATEGORY_NAMES[c]}
            </label>
          ))}
        </fieldset>
      </section>
      <section className="sc-card sc-form-card">
        <h2>Distribuição</h2>
        <label className="sc-check">
          <input
            type="checkbox"
            checked={rules.avoid_consecutive}
            onChange={(e) =>
              setRules({ ...rules, avoid_consecutive: e.target.checked })
            }
          />
          Evitar participações consecutivas
        </label>
        <label className="sc-check">
          <input
            type="checkbox"
            checked={rules.allow_same_organist}
            onChange={(e) =>
              setRules({ ...rules, allow_same_organist: e.target.checked })
            }
          />
          Permitir mesma organista na meia hora e no culto
        </label>
      </section>
      <h2 className="sc-section-title">Dependências entre membros</h2>
      <p className="sc-muted">
        Dias indisponíveis e datas específicas são editados no cadastro de cada
        membro. Vínculos se aplicam ao mesmo evento.
      </p>
      {dependencies.map((d, n) => (
        <fieldset className="sc-dep" key={d.id}>
          <legend>Vínculo {n + 1}</legend>
          <label>
            Quando estiver escalado
            <select
              value={d.trigger_member}
              onChange={(e) => update(d.id, { trigger_member: e.target.value })}
            >
              {context.members.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Em uma destas funções</legend>
            {roles.map((r) => (
              <label className="sc-check" key={r}>
                <input
                  type="checkbox"
                  checked={d.trigger_roles.includes(r)}
                  onChange={(e) =>
                    update(d.id, {
                      trigger_roles: e.target.checked
                        ? [...d.trigger_roles, r]
                        : d.trigger_roles.filter((x) => x !== r),
                    })
                  }
                />
                {labels[r]}
              </label>
            ))}
          </fieldset>
          <label>
            Exigir este membro
            <select
              value={d.required_member}
              onChange={(e) =>
                update(d.id, { required_member: e.target.value })
              }
            >
              {context.members.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nesta função
            <select
              value={d.required_role}
              onChange={(e) =>
                update(d.id, {
                  required_role: e.target.value as Dependency["required_role"],
                })
              }
            >
              {roles.map((r) => (
                <option value={r} key={r}>
                  {labels[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="sc-check">
            <input
              type="checkbox"
              checked={d.exclusive}
              onChange={(e) => update(d.id, { exclusive: e.target.checked })}
            />
            Também impedir o membro exigido de atuar nesta função sem o primeiro
            membro
          </label>
          <label className="sc-check">
            <input
              type="checkbox"
              checked={d.enabled}
              onChange={(e) => update(d.id, { enabled: e.target.checked })}
            />
            Vínculo ativo
          </label>
          <button
            type="button"
            className="sc-btn sc-btn-danger"
            onClick={() =>
              setDependencies(dependencies.filter((x) => x.id !== d.id))
            }
          >
            Remover vínculo ao salvar
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="sc-btn sc-btn-ghost"
        disabled={context.members.length < 2}
        onClick={() =>
          setDependencies([
            ...dependencies,
            {
              id: randomUUID(),
              trigger_member: context.members[0].id,
              trigger_roles: [context.members[0].allowed_roles[0]],
              required_member: context.members[1].id,
              required_role: context.members[1].allowed_roles[0],
              exclusive: false,
              enabled: true,
            },
          ])
        }
      >
        Adicionar vínculo
      </button>
      <div className="sc-actions-bar sc-actions-sticky">
        <button className="sc-btn" disabled={busy}>
          {busy ? "Salvando…" : "Salvar regras"}
        </button>
        {feedback}
      </div>
    </form>
  );
}

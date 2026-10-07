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
} from "@/components/escalas/admin-ui";
import {
  categories,
  roles,
  labels,
  categoryOf,
  memberSchema,
  monthSchema,
  categorySchema,
  today,
  type Member,
  type Context,
  type Period,
  type Rules,
  type Dependency,
  validatePeriod,
  eligible,
} from "@/lib/escalas/domain";

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
export function GenerationForm({ revision }: { revision: number }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof generationSchema>>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      start: today().slice(0, 7),
      end: today().slice(0, 7),
      categories: [...categories],
    },
  });
  const { save, busy, feedback } = useSave(revision);
  return (
    <form
      className="sc-form"
      onSubmit={handleSubmit((v) => save("generate", v))}
    >
      <section className="sc-card sc-form-card">
        <h2>Período</h2>
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
        <fieldset>
          <legend>Categorias</legend>
          {categories.map((c) => (
            <label className="sc-check" key={c}>
              <input type="checkbox" value={c} {...register("categories")} />
              {CATEGORY_NAMES[c]}
            </label>
          ))}
        </fieldset>
        <p className="sc-muted">
          Até 12 meses. As escalas existentes não serão substituídas. Inclua as
          categorias dos membros vinculados para permitir combinações válidas.
        </p>
      </section>
      {Object.values(errors).map((e, i) => (
        <p className="sc-form-error" role="alert" key={i}>
          {e.message}
        </p>
      ))}
      <div className="sc-actions-bar sc-actions-sticky">
        <button className="sc-btn" disabled={busy}>
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
  const { save, busy, feedback } = useSave(revision);
  const conflicts = validatePeriod(draft, context);
  return (
    <>
      <p className="sc-muted">
        Revise as alterações antes de salvar. Observações dos eventos aparecem
        na escala pública. Cada salvamento registra autor e horário.
      </p>
      <div
        role="status"
        aria-live="polite"
        className={conflicts.length ? "sc-alert" : "sc-card sc-ok"}
      >
        <strong>
          {conflicts.length
            ? `${conflicts.length} conflito(s). A publicação está bloqueada.`
            : "Sem conflitos obrigatórios."}
        </strong>
        <ul>
          {conflicts.map((c, i) => (
            <li key={i}>
              {c.date} · {c.category}: {c.rule} {c.solutions}
            </li>
          ))}
        </ul>
      </div>
      {draft.events.map((event) => (
        <section className="sc-card sc-event-card" key={event.id}>
          <h2>
            {dayLabel(event.date)}
            <span className={`sc-badge sc-kind-badge sc-kind-${event.kind}`}>
              {KIND_NAMES[event.kind] ?? event.kind}
            </span>
          </h2>
          <div className="sc-fields">
            {roles
              .filter(
                (role) =>
                  role.startsWith(`${event.kind}_`) ||
                  (event.kind === "culto" &&
                    [
                      "primeiro",
                      "segundo",
                      "porteira",
                      "meia_hora",
                      "culto",
                    ].includes(role)),
              )
              .filter(
                (role) =>
                  draft.categories.includes(categoryOf(role)) &&
                  (event.kind !== "ensaio" ||
                    context.rules.rehearsal_categories.includes(
                      categoryOf(role),
                    )),
              )
              .map((role) => {
                const current =
                  event.assignments.find((a) => a.role === role)?.member_id ??
                  "";
                return (
                  <label key={role}>
                    {labels[role]}
                    <select
                      value={current}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          events: draft.events.map((ev) =>
                            ev.id !== event.id
                              ? ev
                              : {
                                  ...ev,
                                  assignments: [
                                    ...ev.assignments.filter(
                                      (a) => a.role !== role,
                                    ),
                                    ...(e.target.value
                                      ? [{ role, member_id: e.target.value }]
                                      : []),
                                  ],
                                },
                          ),
                        })
                      }
                    >
                      <option value="">Não atribuído</option>
                      {context.members
                        .filter(
                          (m) =>
                            eligible(m, role, event.date) || m.id === current,
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
            <label>
              Observação pública
              <textarea
                value={event.notes}
                maxLength={2000}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    events: draft.events.map((ev) =>
                      ev.id === event.id
                        ? { ...ev, notes: e.target.value }
                        : ev,
                    ),
                  })
                }
              />
            </label>
          </div>
        </section>
      ))}
      <div className="sc-actions-bar sc-actions-sticky">
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
          Salvar rascunho / despublicar
        </button>
        <button
          type="button"
          className="sc-btn sc-btn-ghost sc-print"
          onClick={() => window.print()}
        >
          Imprimir / PDF
        </button>
        {feedback}
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

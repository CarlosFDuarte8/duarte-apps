"use client";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { randomUUID } from "@/lib/escalas/uuid";
import {
  categories,
  roles,
  labels,
  categoryOf,
  memberSchema,
  type Member,
} from "@/lib/escalas/domain";
import { CATEGORY_NAMES, WEEKDAY_BASE_NAMES } from "@/lib/escalas/names";
import { useSave } from "./use-save";

const emptyMember: Member = {
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
};

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
    defaultValues: member ?? emptyMember,
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
          {WEEKDAY_BASE_NAMES.map((name, i) => (
            <label className="sc-check" key={name}>
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
              {name}
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

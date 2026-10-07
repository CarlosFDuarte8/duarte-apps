"use client";
import { useState } from "react";
import { randomUUID } from "@/lib/escalas/uuid";
import {
  categories,
  type Context,
  type Dependency,
  type Member,
  type Rules,
} from "@/lib/escalas/domain";
import { CATEGORY_NAMES, WEEKDAY_BASE_NAMES } from "@/lib/escalas/names";
import { DependencyCard } from "./dependency-card";
import { useSave } from "./use-save";

/** Vínculo inicial entre os dois primeiros membros, pronto para ser ajustado. */
function newDependency([trigger, required]: Member[]): Dependency {
  return {
    id: randomUUID(),
    trigger_member: trigger.id,
    trigger_roles: [trigger.allowed_roles[0]],
    required_member: required.id,
    required_role: required.allowed_roles[0],
    exclusive: false,
    enabled: true,
  };
}

function toggle<T>(list: T[], item: T, on: boolean) {
  return on ? [...list, item] : list.filter((x) => x !== item);
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
  const patchRules = (patch: Partial<Rules>) => setRules({ ...rules, ...patch });
  const patchDependency = (id: string, patch: Partial<Dependency>) =>
    setDependencies(
      dependencies.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
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
          {WEEKDAY_BASE_NAMES.map((name, i) => (
            <label className="sc-check" key={name}>
              <input
                type="checkbox"
                checked={rules.official_weekdays.includes(i)}
                onChange={(e) =>
                  patchRules({
                    official_weekdays: toggle(
                      rules.official_weekdays,
                      i,
                      e.target.checked,
                    ),
                  })
                }
              />
              {name}
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
                onChange={(e) => patchRules({ [key]: Number(e.target.value) })}
              >
                {WEEKDAY_BASE_NAMES.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
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
                  patchRules({
                    rehearsal_categories: toggle(
                      rules.rehearsal_categories,
                      c,
                      e.target.checked,
                    ),
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
            onChange={(e) => patchRules({ avoid_consecutive: e.target.checked })}
          />
          Evitar participações consecutivas
        </label>
        <label className="sc-check">
          <input
            type="checkbox"
            checked={rules.allow_same_organist}
            onChange={(e) =>
              patchRules({ allow_same_organist: e.target.checked })
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
      {dependencies.map((d, index) => (
        <DependencyCard
          key={d.id}
          index={index}
          dependency={d}
          members={context.members}
          onChange={(patch) => patchDependency(d.id, patch)}
          onRemove={() => setDependencies(dependencies.filter((x) => x.id !== d.id))}
        />
      ))}
      <button
        type="button"
        className="sc-btn sc-btn-ghost"
        disabled={context.members.length < 2}
        onClick={() =>
          setDependencies([...dependencies, newDependency(context.members)])
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

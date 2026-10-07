"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  categories,
  categoryOf,
  compareEvents,
  labels,
  shiftMonth,
  weekday,
  type Role,
} from "@/lib/escalas/domain";
export type PublicEvent = {
  id: string;
  date: string;
  kind: string;
  notes: string;
  assignments: { role: Role; name: string }[];
};

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const CATEGORY_LABELS: Record<(typeof categories)[number], string> = {
  porteiro: "Porteiros",
  porteira: "Porteiras",
  organista: "Organistas",
};
const KIND_LABELS: Record<string, string> = {
  culto: "Culto oficial",
  jovens: "Jovens e menores",
  ensaio: "Ensaio local",
};
const longDate = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

// Ordem de apresentação das funções dentro do evento.
const ROLE_ORDER: Role[] = ["primeiro", "segundo", "porteira", "culto", "meia_hora"];

function sortEvents<T extends { date: string; kind: string }>(items: T[]) {
  return [...items].sort(compareEvents);
}

function sortAssignments<T extends { role: Role }>(items: T[]) {
  return [...items].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5,
  );
}

function relativeLabel(diff: number) {
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return `Em ${diff} dias`;
}
export function PublicCalendar({
  month,
  events,
  upcoming,
  currentDate,
}: {
  month: string;
  events: PublicEvent[];
  upcoming: PublicEvent[];
  currentDate: string;
}) {
  const params = useSearchParams() ?? new URLSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = params.get("nome") ?? "";
  const hidden = params.getAll("ocultar");
  const list = params.get("vista") === "lista";
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next}`, { scroll: false });
  }
  function toggle(category: string) {
    const next = new URLSearchParams(params);
    next.delete("ocultar");
    (hidden.includes(category)
      ? hidden.filter((c) => c !== category)
      : [...hidden, category]
    ).forEach((c) => next.append("ocultar", c));
    router.replace(`?${next}`, { scroll: false });
  }
  function go(value: string) {
    router.push(`/escalas/${value.replace("-", "/")}?${params}`);
  }
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = events
    .map((e) => ({
      ...e,
      assignments: e.assignments.filter(
        (a) =>
          !hidden.includes(categoryOf(a.role)) &&
          normalize(a.name).includes(normalize(search)),
      ),
    }))
    .filter((e) => e.assignments.length > 0);
  const heroDate = upcoming.map((e) => e.date).sort()[0];
  const heroEvents = upcoming.filter((e) => e.date === heroDate);
  const heroDiff = heroDate ? daysBetween(currentDate, heroDate) : 0;
  const next = heroDiff > 0 ? heroDate : undefined;
  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const hasFilters = search !== "" || hidden.length > 0;
  const filterCount = (search ? 1 : 0) + hidden.length;
  const activeDays = new Set(filtered.map((e) => e.date)).size;
  function clearFilters() {
    const next = new URLSearchParams(params);
    next.delete("nome");
    next.delete("ocultar");
    router.replace(`?${next}`, { scroll: false });
  }
  return (
    <>
      {heroDate && (
        <section className="sc-hero" aria-labelledby="sc-hero-title">
          <div className="sc-hero-top">
            <span className="sc-hero-badge">
              {heroDiff === 0 ? "Acontece hoje" : "Próximo evento"}
            </span>
            <span className="sc-hero-when">{relativeLabel(heroDiff)}</span>
          </div>
          <h2 id="sc-hero-title">
            {longDate.format(new Date(`${heroDate}T12:00:00Z`))}
          </h2>
          <div className="sc-hero-events">
            {sortEvents(heroEvents).map((e) => (
              <div key={e.id} className="sc-hero-event">
                <h3>{KIND_LABELS[e.kind] ?? e.kind}</h3>
                <ul>
                  {sortAssignments(e.assignments).map((a) => (
                    <li key={a.role} className={`sc-${categoryOf(a.role)}`}>
                      <small>{labels[a.role]}</small>
                      <strong>{a.name}</strong>
                    </li>
                  ))}
                </ul>
                {e.notes && <p className="sc-note">{e.notes}</p>}
              </div>
            ))}
          </div>
          {heroDate.slice(0, 7) === month ? (
            <a className="sc-hero-link" href={`#dia-${heroDate}`}>
              Ver no calendário
            </a>
          ) : (
            <button
              type="button"
              className="sc-hero-link"
              onClick={() => go(heroDate.slice(0, 7))}
            >
              Ver no calendário
            </button>
          )}
        </section>
      )}
      <div className="sc-panel sc-monthbar">
        <div className="sc-pager" role="group" aria-label="Navegar entre meses">
          <button
            type="button"
            className="sc-btn sc-btn-ghost sc-step"
            aria-label="Mês anterior"
            onClick={() => go(shiftMonth(month, -1))}
          >
            <span aria-hidden="true">←</span>
            <span className="sc-btn-text">Anterior</span>
          </button>
          <label className="sc-field sc-month-field">
            <span>Mês</span>
            <input
              type="month"
              min="2000-01"
              max="2099-12"
              value={month}
              onChange={(e) => {
                if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value))
                  go(e.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="sc-btn sc-btn-ghost sc-step"
            aria-label="Próximo mês"
            onClick={() => go(shiftMonth(month, 1))}
          >
            <span className="sc-btn-text">Próximo</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="sc-actions">
          <button
            type="button"
            className="sc-btn"
            disabled={month === currentDate.slice(0, 7)}
            onClick={() => go(currentDate.slice(0, 7))}
          >
            Hoje
          </button>
          <button
            type="button"
            className="sc-btn sc-btn-ghost sc-filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls="sc-filters"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filtros
            {filterCount > 0 && (
              <span className="sc-count" aria-label={`${filterCount} ativos`}>
                {filterCount}
              </span>
            )}
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
      <div
        id="sc-filters"
        className={`sc-panel sc-filters ${filtersOpen ? "is-open" : ""}`}
      >
        <label className="sc-field sc-search">
          <span>Buscar pelo nome</span>
          <input
            type="search"
            placeholder="Ex.: Maria"
            value={search}
            onChange={(e) => filter("nome", e.target.value)}
          />
        </label>
        <div className="sc-field sc-view-field">
          <span id="sc-view-label">Visualização</span>
          <div
            className="sc-segmented"
            role="group"
            aria-labelledby="sc-view-label"
          >
            <button
              type="button"
              aria-pressed={!list}
              onClick={() => filter("vista", "")}
            >
              Calendário
            </button>
            <button
              type="button"
              aria-pressed={list}
              onClick={() => filter("vista", "lista")}
            >
              Lista
            </button>
          </div>
        </div>
        <div className="sc-field">
          <span id="sc-cat-label">Mostrar na escala</span>
          <div className="sc-chips" role="group" aria-labelledby="sc-cat-label">
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                className={`sc-chip sc-${c}`}
                aria-pressed={!hidden.includes(c)}
                onClick={() => toggle(c)}
              >
                <i aria-hidden="true" />
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        {hasFilters && (
          <button
            type="button"
            className="sc-btn sc-btn-link"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        )}
      </div>
      {!events.length ? (
        <div className="sc-card sc-notice">
          <strong>Nenhuma escala publicada para este mês.</strong>
          <p>Use os botões acima para navegar até outro mês.</p>
        </div>
      ) : !filtered.length ? (
        <div className="sc-card sc-notice">
          <strong>Nenhum participante corresponde aos filtros.</strong>
          <p>Revise a busca ou as categorias selecionadas.</p>
          {hasFilters && (
            <button type="button" className="sc-btn" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="sc-summary" role="status">
            {activeDays} {activeDays === 1 ? "dia com escala" : "dias com escala"}
            {hasFilters && " (filtrado)"}
          </p>
          <div className={list ? "sc-list" : ""}>
            <div className="sc-calendar">
              {WEEKDAYS_SHORT.map((d) => (
                <div className="sc-weekday" key={d}>
                  {d}
                </div>
              ))}
              {Array.from({ length: weekday(`${month}-01`) }, (_, i) => (
                <div className="sc-empty" key={`blank${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                const entries = filtered.filter((e) => e.date === date);
                const w = weekday(date);
                return (
                  <article
                    key={date}
                    id={`dia-${date}`}
                    aria-current={date === currentDate ? "date" : undefined}
                    className={`sc-day ${!entries.length ? "sc-empty" : ""} ${date === next ? "sc-next" : ""} ${date === currentDate ? "sc-today" : ""} ${date < currentDate ? "sc-past" : ""}`}
                  >
                    <header className="sc-day-head">
                      <time dateTime={date}>
                        <span className="sc-day-num">{i + 1}</span>
                        <span className="sc-wd-long">{WEEKDAYS_LONG[w]}</span>
                      </time>
                      {date === currentDate && (
                        <span className="sc-tag sc-tag-today">Hoje</span>
                      )}
                      {date === next && (
                        <span className="sc-tag sc-tag-next">Próximo</span>
                      )}
                    </header>
                    <div className="sc-events">
                      {sortEvents(entries).map((e) => (
                        <section
                          key={e.id}
                          className={`sc-event sc-kind-${e.kind}`}
                        >
                          <h3>{KIND_LABELS[e.kind] ?? e.kind}</h3>
                          {sortAssignments(e.assignments).map((a) => (
                            <p
                              key={a.role}
                              className={`sc-assign sc-${categoryOf(a.role)} ${search ? "sc-hit" : ""}`}
                            >
                              <small>{labels[a.role]}</small>
                              <strong>{a.name}</strong>
                            </p>
                          ))}
                          {e.notes && <p className="sc-note">{e.notes}</p>}
                        </section>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
      <p className="sc-hint">
        Para baixar: escolha “Imprimir / salvar PDF” e selecione “Salvar como
        PDF” no navegador.
      </p>
    </>
  );
}

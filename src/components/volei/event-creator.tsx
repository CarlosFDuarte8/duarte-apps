"use client";
import { useState } from "react";
import { createEvents } from "@/app/admin/volei-actions";
import { daysInMonth, weekdayOf } from "@/lib/volei/domain";
import { useRun } from "./use-run";
import "./volei.css";
import { NativeSelect } from "@/components/ui/native-select";

const SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function EventCreator({ month }: { month: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const { run, pending, feedback } = useRun();
  const total = daysInMonth(month);
  const days = Array.from(
    { length: total },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );

  return (
    <form
      className="sc-card sc-form-card"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        run(
          () =>
            createEvents({
              dates: selected,
              title: form.get("title"),
              start_time: form.get("start_time"),
              location: form.get("location"),
              notes: form.get("notes"),
              registration_time: form.get("registration_time"),
              max_teams: Number(form.get("max_teams")),
            }),
          () => setSelected([]),
        );
      }}
    >
      <h2>Adicionar dias de jogo</h2>
      <div className="vl-days" role="group" aria-label="Dias do mês">
        {days.map((date) => {
          const day = Number(date.slice(8));
          const on = selected.includes(date);
          return (
            <button
              type="button"
              key={date}
              className="vl-day"
              aria-pressed={on}
              onClick={() =>
                setSelected((cur) =>
                  on ? cur.filter((d) => d !== date) : [...cur, date],
                )
              }
            >
              <small>{SHORT[weekdayOf(date)]}</small>
              <strong>{day}</strong>
            </button>
          );
        })}
      </div>
      <div className="sc-fields">
        <label>
          Times e vagas
          <NativeSelect name="max_teams" defaultValue="3">
            <option value="3">3 times · 18 vagas (padrão)</option>
            <option value="4">4 times · 24 vagas (exceção)</option>
          </NativeSelect>
        </label>
        <label>
          Confirmar presença até (Brasília)
          <input
            type="time"
            name="registration_time"
            defaultValue="18:00"
            required
          />
          <small>
            No dia do jogo. Padrão: 18h. Convidados são liberados a partir desse
            prazo, conforme as vagas.
          </small>
        </label>
        <label>
          Título
          <input name="title" defaultValue="Vôlei" required maxLength={100} />
        </label>
        <label>
          Horário
          <input name="start_time" placeholder="19h" maxLength={20} />
        </label>
        <label>
          Local
          <input name="location" maxLength={120} />
        </label>
        <label>
          Observações
          <input name="notes" maxLength={500} />
        </label>
      </div>
      {feedback}
      <button
        type="submit"
        className="sc-btn"
        disabled={pending || selected.length === 0}
      >
        {pending
          ? "Salvando…"
          : `Adicionar ${selected.length || ""} ${selected.length === 1 ? "dia" : "dias"}`}
      </button>
    </form>
  );
}

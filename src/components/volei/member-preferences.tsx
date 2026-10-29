"use client";
import { useId, useState } from "react";
import type { VoleiMember } from "@/lib/volei/domain";
import { WEEKDAY_LABELS } from "@/lib/volei/frequency";
import { saveMemberPreferences } from "@/app/admin/volei-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useRun } from "./use-run";
export function MemberPreferences({ member }: { member: VoleiMember }) {
  const [core, setCore] = useState(!!member.is_core);
  const [weekdays, setWeekdays] = useState(member.preferred_weekdays ?? []);
  const [dates, setDates] = useState(member.preferred_dates ?? []);
  const [excluded, setExcluded] = useState(member.unavailable_dates ?? []);
  const [notes, setNotes] = useState(member.preference_notes ?? "");
  const [saved, setSaved] = useState(false);
  const { run, pending, feedback } = useRun();
  const id = useId();
  return (
    <form
      className="vm-preferences"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        run(
          () =>
            saveMemberPreferences(member.id, {
              is_core: core,
              preferred_weekdays: weekdays,
              preferred_dates: dates,
              unavailable_dates: excluded,
              preference_notes: notes,
            }),
          () => setSaved(true),
        );
      }}
    >
      <h4>Grupo e preferências</h4>
      <label className="vm-core-control">
        <Checkbox
          checked={core}
          onCheckedChange={(v) => setCore(v === true)}
          aria-label="Faz parte do grupo principal"
        />
        <span>
          <strong>Faz parte do grupo principal</strong>
          <small>
            Reserva uma vaga nos dias preferidos até marcar “não vou”. Não
            retira vagas já confirmadas de outras pessoas.
          </small>
        </span>
      </label>
      <fieldset>
        <legend>Dias fixos preferidos</legend>
        <div className="vm-weekdays">
          {WEEKDAY_LABELS.map((day, i) => (
            <label key={day}>
              <Checkbox
                aria-label={day}
                checked={weekdays.includes(i)}
                onCheckedChange={(v) =>
                  setWeekdays((current) =>
                    v === true
                      ? [...current, i]
                      : current.filter((d) => d !== i),
                  )
                }
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="vm-hint">
        No grupo principal, estes dias definem quando reservar uma vaga. Sem
        dias definidos, a reserva vale para todos os jogos. Outros dias
        continuam disponíveis para inscrição, sem reserva automática.
      </p>
      <DateChoices
        label="Datas avulsas preferidas"
        hint="Para alguns sábados, adicione somente as datas combinadas."
        dates={dates}
        onChange={setDates}
      />
      <DateChoices
        label="Datas indisponíveis"
        hint="Exceções aos dias fixos, como uma viagem ou compromisso."
        dates={excluded}
        onChange={setExcluded}
      />
      <label htmlFor={`${id}-notes`}>
        Observações
        <Textarea
          id={`${id}-notes`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ex.: quartas sempre; sábados somente quando combinar."
        />
      </label>
      {feedback}
      {saved && (
        <p role="status" className="vm-success">
          Preferências salvas.
        </p>
      )}
      <Button type="submit" loading={pending}>
        {pending ? "Salvando…" : "Salvar preferências"}
      </Button>
    </form>
  );
}
function DateChoices({
  label,
  hint,
  dates,
  onChange,
}: {
  label: string;
  hint: string;
  dates: string[];
  onChange: (dates: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();
  return (
    <div className="vm-date-choices">
      <label htmlFor={id}>{label}</label>
      <div className="vm-date-input">
        <Input
          id={id}
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          variant="outline"
          type="button"
          disabled={!draft || dates.includes(draft) || dates.length >= 50}
          onClick={() => {
            onChange([...dates, draft].sort());
            setDraft("");
          }}
        >
          Adicionar data
        </Button>
      </div>
      <p className="vm-hint">{hint}</p>
      <div className="vm-date-chips">
        {dates.map((date) => (
          <Button
            key={date}
            variant="secondary"
            type="button"
            aria-label={`Remover ${date.split("-").reverse().join("/")} de ${label}`}
            onClick={() => onChange(dates.filter((d) => d !== date))}
          >
            {date.split("-").reverse().join("/")} ×
          </Button>
        ))}
      </div>
    </div>
  );
}

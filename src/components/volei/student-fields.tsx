"use client";
import "./student-fields.css";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { ClassTimeField } from "./class-time-field";
import { WEEKDAY_LABELS } from "@/lib/volei/frequency";
import { useId } from "react";
export function StudentFields({
  isStudent,
  days,
  onStudentChange,
  onDaysChange,
  disabled = false,
  selfRegistration = false,
  classTime,
  onClassTimeChange,
  requireAnswer = false,
  excludeEveningClass = false,
}: {
  isStudent: boolean | null;
  days: number[];
  onStudentChange: (value: boolean) => void;
  onDaysChange: (days: number[]) => void;
  disabled?: boolean;
  selfRegistration?: boolean;
  classTime?: string;
  onClassTimeChange?: (value: string) => void;
  requireAnswer?: boolean;
  excludeEveningClass?: boolean;
}) {
  const id = useId();
  return (
    <fieldset disabled={disabled} className="vm-student-fields">
      <legend>Aluno da turma</legend>
      {requireAnswer ? <div className="volley-filter-field">
        <label htmlFor={id}>Você é aluno?</label>
        <NativeSelect id={id} required value={isStudent === null ? "" : isStudent ? "yes" : "no"} onChange={event => onStudentChange(event.target.value === "yes")}>
          <option value="" disabled>Selecione uma opção</option>
          <option value="yes">Sim, sou aluno</option>
          <option value="no">Não sou aluno</option>
        </NativeSelect>
      </div> : <label className="vm-core-control">
        <Checkbox
          checked={isStudent === true}
          onCheckedChange={(value) => onStudentChange(value === true)}
        />
        <span>{selfRegistration ? "Sou aluno" : "É aluno"}</span>
      </label>}
      {isStudent && (
        <>
          <p>Selecione os dias de aula:</p>
          <div className="vm-weekdays">
            {WEEKDAY_LABELS.map((label, day) => (
              <label key={day}>
                <Checkbox
                  checked={days.includes(day)}
                  aria-label={`Aula de ${label.toLowerCase()}`}
                  onCheckedChange={(checked) =>
                    onDaysChange(
                      checked === true
                        ? [...days, day].sort()
                        : days.filter((item) => item !== day),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {onClassTimeChange && <ClassTimeField value={classTime ?? ""} onChange={onClassTimeChange} excludeEveningClass={excludeEveningClass} />}
        </>
      )}
      <p className="vm-hint">
        {selfRegistration
          ? "Informe sua turma. O responsável vai conferir esses dados; a declaração não aprova a turma automaticamente."
          : "Confira os dias e o horário da turma antes de aprovar. A preferência depende também da idade e do dia do jogo. O aluno ainda precisa confirmar presença."}
      </p>
    </fieldset>
  );
}

"use client";
import "./student-fields.css";
import { Checkbox } from "@/components/ui/checkbox";
import { WEEKDAY_LABELS } from "@/lib/volei/frequency";
export function StudentFields({
  isStudent,
  days,
  onStudentChange,
  onDaysChange,
  disabled = false,
  selfRegistration = false,
}: {
  isStudent: boolean;
  days: number[];
  onStudentChange: (value: boolean) => void;
  onDaysChange: (days: number[]) => void;
  disabled?: boolean;
  selfRegistration?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="vm-student-fields">
      <legend>Aluno da turma</legend>
      <label className="vm-core-control">
        <Checkbox
          checked={isStudent}
          onCheckedChange={(value) => onStudentChange(value === true)}
        />
        <span>{selfRegistration ? "Sou aluno" : "É aluno"}</span>
      </label>
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
        </>
      )}
      <p className="vm-hint">
        {selfRegistration
          ? "O administrador precisa confirmar os dias de aula antes de liberar a prioridade."
          : "Os dias salvos ficam aprovados e dão prioridade na fila desses dias. O aluno ainda precisa se inscrever no jogo."}
      </p>
    </fieldset>
  );
}

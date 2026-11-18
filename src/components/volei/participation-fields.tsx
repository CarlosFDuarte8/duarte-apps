"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ageOn, requiredBirthDateSchema } from "@/lib/volei/profile";
import type { EnrollmentDraft } from "@/lib/volei/students";
import { BirthDateField } from "./birth-date-field";
import { StudentFields } from "./student-fields";

/** Shared by new registrations and the one-time review before joining. */
export function ParticipationFields({ birthDate, onBirthDateChange, enrollment, onEnrollmentChange, onReadyChange, disabled = false, onDate }: {
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  enrollment: EnrollmentDraft;
  onEnrollmentChange: (value: EnrollmentDraft) => void;
  onReadyChange: (ready: boolean) => void;
  disabled?: boolean;
  onDate?: string;
}) {
  const [next, setNext] = useState(false);
  const fields = useRef<HTMLDivElement>(null);
  const minor = (ageOn(birthDate, onDate) ?? 0) < 18;
  return <div ref={fields} className="volley-participation-fields">
    <BirthDateField value={birthDate} disabled={disabled} onChange={value => {
      onBirthDateChange(value); setNext(false); onReadyChange(false);
    }} />
    {!next ? <Button type="button" data-participation-next variant="outline" disabled={disabled} onClick={() => {
      const input = fields.current?.querySelector<HTMLInputElement>('input[name="birth_date"]');
      if (!input?.reportValidity() || !requiredBirthDateSchema.safeParse(birthDate).success) return;
      if (minor && enrollment.classTime.startsWith("18:")) onEnrollmentChange({ ...enrollment, classTime: "" });
      setNext(true); onReadyChange(true);
    }}>Continuar com os dados da turma</Button> : <StudentFields
      isStudent={enrollment.isStudent} days={enrollment.days} classTime={enrollment.classTime}
      onStudentChange={isStudent => onEnrollmentChange({ ...enrollment, isStudent })}
      onDaysChange={days => onEnrollmentChange({ ...enrollment, days })}
      onClassTimeChange={classTime => onEnrollmentChange({ ...enrollment, classTime })}
      disabled={disabled} requireAnswer selfRegistration
      excludeEveningClass={minor}
    />}
    <p className="volley-muted">Nascimento e dados da turma são privados. Não aparecem na lista pública.</p>
  </div>;
}

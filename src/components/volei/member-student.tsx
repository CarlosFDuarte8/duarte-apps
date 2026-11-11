"use client";
import { useState } from "react";
import type { VoleiMember } from "@/lib/volei/domain";
import { WEEKDAY_LABELS } from "@/lib/volei/frequency";
import { saveStudentDays } from "@/app/admin/volei-actions";
import { Button } from "@/components/ui/button";
import { StudentFields } from "./student-fields";
import { useRun } from "./use-run";
export function MemberStudent({ member }: { member: VoleiMember }) {
  const request = member.requested_student_weekdays;
  const [days, setDays] = useState(request ?? member.student_weekdays ?? []);
  const [isStudent, setIsStudent] = useState(days.length > 0);
  const { run, pending, feedback } = useRun();
  return (
    <form
      className="vm-preferences"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          saveStudentDays(member.id, {
            enrollment: { isStudent, days },
            expectedDays: member.student_weekdays ?? [],
            expectedRequest: request ?? null,
          }),
        );
      }}
    >
      <h4>Aluno e dias de aula</h4>
      {request != null && (
        <p role="status" className="vm-hint">
          Solicitação pendente:{" "}
          {request.map((day) => WEEKDAY_LABELS[day]).join(", ")}. Confira os
          dias antes de salvar. Desmarque “É aluno” para recusar.
        </p>
      )}
      <p>
        Dias aprovados:{" "}
        {member.student_weekdays?.length
          ? member.student_weekdays.map((day) => WEEKDAY_LABELS[day]).join(", ")
          : "Nenhum"}
        .
      </p>
      <StudentFields
        isStudent={isStudent}
        days={days}
        onStudentChange={setIsStudent}
        onDaysChange={setDays}
        disabled={pending}
      />
      {feedback}
      <Button type="submit" loading={pending}>
        Salvar dias de aula
      </Button>
    </form>
  );
}

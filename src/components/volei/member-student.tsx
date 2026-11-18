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
  const [classTime, setClassTime] = useState((request != null ? member.requested_student_class_time : member.student_class_time)?.slice(0, 5) ?? "");
  const { run, pending, feedback } = useRun();
  return (
    <form
      className="vm-preferences"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          saveStudentDays(member.id, {
            enrollment: { isStudent, days, classTime },
            expectedDays: member.student_weekdays ?? [],
            expectedRequest: request ?? null,
            expectedTime: member.student_class_time ?? null,
            expectedRequestedTime: member.requested_student_class_time ?? null,
            expectedReviewedAt: member.participation_reviewed_at ?? null,
          }),
        );
      }}
    >
      <h4>Aluno e turma</h4>
      {request != null && (
        <p role="status" className="vm-hint">
          Solicitação pendente:{" "}
          {request.map((day) => WEEKDAY_LABELS[day]).join(", ")}
          {member.requested_student_class_time ? ` às ${member.requested_student_class_time.slice(0, 5)}` : " · horário não informado"}. Confira a
          turma antes de salvar. Desmarque “É aluno” para recusar.
        </p>
      )}
      <p>
        Dias aprovados:{" "}
        {member.student_weekdays?.length
          ? member.student_weekdays.map((day) => WEEKDAY_LABELS[day]).join(", ")
          : "Nenhum"}
        . {member.student_class_time ? `Horário aprovado: ${member.student_class_time.slice(0, 5)}.` : member.student_weekdays?.length ? "Confira o horário para validar esta turma." : ""}
      </p>
      <StudentFields
        isStudent={isStudent}
        days={days}
        onStudentChange={setIsStudent}
        onDaysChange={setDays}
        disabled={pending}
        classTime={classTime}
        onClassTimeChange={setClassTime}
      />
      {feedback}
      <Button type="submit" loading={pending}>
        Salvar turma validada
      </Button>
    </form>
  );
}

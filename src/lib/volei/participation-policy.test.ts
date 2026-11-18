import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { admissionForEvent, priorityForEvent, registrationWindow } from "./participation-policy";
import type { VoleiEvent } from "./domain";
import { ownParticipationProfile } from "./participation-profile";
import { studentClassSchema } from "./students";

const event: VoleiEvent = { id: "event", date: "2026-11-24", title: "Vôlei", start_time: "19:00", location: "COP", notes: "", closed: false, registration_deadline: "2026-11-24T18:00:00-03:00" };
const adult = { birth_date: "1995-01-01", student_weekdays: [], student_class_time: null, participation_reviewed_at: "2026-11-20T12:00:00Z" };
const student = { ...adult, student_weekdays: [2], student_class_time: "18:00:00" };

it("abre aluno adulto na véspera apenas no dia/turma aprovados", () => {
  expect(priorityForEvent(student,event.date)).toBe(0);
  expect(registrationWindow(event,student).opensAt).toBe("2026-11-23T00:00:00-03:00");
  for (const member of [adult, { ...student, student_weekdays: [3] }, { ...student, student_class_time: "17:00" }]) {
    expect(priorityForEvent(member,event.date)).toBe(1);
    expect(registrationWindow(event,member).opensAt).toBe("2026-11-23T22:00:00-03:00");
  }
});
it("nascimento desconhecido e menor não herdam prioridade de aluno nem de principal", () => {
  for (const birth_date of [null,"2010-01-01","2008-11-25"]) {
    const member = { ...student, birth_date, is_core: true };
    expect(priorityForEvent(member,event.date)).toBe(2);
    expect(registrationWindow(event,member).opensAt).toBe("2026-11-24T08:00:00-03:00");
  }
  expect(priorityForEvent({ ...student, birth_date: "2008-11-24" },event.date)).toBe(0);
});
it.each([
  [student,"2026-11-22T23:59:59-03:00",false], [student,"2026-11-23T00:00:00-03:00",true],
  [adult,"2026-11-23T21:59:59-03:00",false], [adult,"2026-11-23T22:00:00-03:00",true],
  [{ ...student,birth_date: "2010-01-01" },"2026-11-24T07:59:59-03:00",false],
  [{ ...student,birth_date: "2010-01-01" },"2026-11-24T08:00:00-03:00",true],
  [{ ...student,birth_date: "2010-01-01" },"2026-11-24T18:00:00-03:00",true],
  [{ ...student,birth_date: "2010-01-01" },"2026-11-24T18:00:01-03:00",false],
] as const)("valida limites da janela sem depender do fuso do navegador (%s, %s)", (member,now,open) => {
  expect(admissionForEvent(event,member,new Date(now)).open).toBe(open);
});
it("mantém prazo menor para menores, encerramento manual e chamada concluída", () => {
  const minor = { ...student,birth_date: "2010-01-01" };
  expect(registrationWindow({ ...event,registration_deadline: "2026-11-24T23:00:00-03:00" },minor).closesAt).toBe("2026-11-24T18:00:00-03:00");
  expect(registrationWindow({ ...event,registration_deadline: "2026-11-24T17:00:00-03:00" },minor).closesAt).toBe("2026-11-24T17:00:00-03:00");
  for (const change of [{ closed: true },{ presence_closed_at: "2026-11-24T12:00:00Z" }])
    expect(admissionForEvent({ ...event,...change },student,new Date("2026-11-24T12:00:00-03:00")).state).toBe("closed");
});
it("exige identificação e conferência sem publicar idade/turma na janela", () => {
  const now = new Date("2026-11-24T12:00:00-03:00");
  expect(admissionForEvent(event,null,now).state).toBe("identify");
  expect(admissionForEvent(event,{ ...student,participation_reviewed_at: null },now).state).toBe("review");
  expect(JSON.stringify(admissionForEvent(event,student,now))).not.toMatch(/1995|birth|class_time|student_weekdays|tier/);
  expect(ownParticipationProfile({ ...student })).toEqual({ birthDate: null,days: [],classTime: null,reviewed: true });
});
it("exige resposta explícita e horário válido sem aceitar aprovação enviada pelo navegador", () => {
  for (const value of [{ isStudent: null,days: [] },{ isStudent: true,days: [2],classTime: "" },{ isStudent: true,days: [2],classTime: "25:00" }])
    expect(studentClassSchema.safeParse(value).success).toBe(false);
  expect(studentClassSchema.parse({ isStudent: true,days: [4,2,2],classTime: "18:00",approved: true })).toEqual({ days: [2,4],classTime: "18:00" });
  expect(studentClassSchema.parse({ isStudent: false,days: [2],classTime: "18:00" })).toEqual({ days: [],classTime: null });
});

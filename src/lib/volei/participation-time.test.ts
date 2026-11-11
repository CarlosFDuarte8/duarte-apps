import { expect, it } from "vitest";
import { participationTime } from "./participation-time";
it("separa confirmação de inscrição e usa horário de Brasília", () => {
  const registration = "2026-11-10T22:45:00Z",
    confirmation = "2026-11-11T15:30:00Z";
  expect(participationTime("confirmado", registration, confirmation)).toEqual({
    dateTime: confirmation,
    label: "Confirmado em 11/11, 12:30",
  });
  expect(participationTime("espera", registration, confirmation)?.label).toBe(
    "Inscrito em 10/11, 19:45",
  );
  expect(participationTime("confirmado", registration, null)?.label).toBe(
    "Inscrito em 10/11, 19:45",
  );
  expect(participationTime("confirmado", null, null)).toBeNull();
  expect(participationTime("confirmado", "invalid", null)).toBeNull();
});

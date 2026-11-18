import { expect, it } from "vitest";
import type { VoleiEvent } from "./domain";
import { eventCalendar, eventStartTime } from "./event-links";

const event: VoleiEvent = { id: "11111111-1111-4111-8111-111111111111", date: "2026-11-18", title: "Vôlei", start_time: "19:00", location: "Quadra COP, Brasília", notes: "", closed: false };
const calendar = (changes: Partial<VoleiEvent> = {}) => eventCalendar({ ...event, ...changes }, "https://quadra.example", new Date("2026-11-17T10:00:00Z"));

it("exports Brasília time in UTC, including a change of day, without inventing an end time", () => {
  expect(calendar()).toContain("DTSTART:20261118T220000Z\r\n");
  expect(calendar({ start_time: "23h30" })).toContain("DTSTART:20261119T023000Z\r\n");
  expect(calendar()).not.toContain("DTEND");
  expect(calendar()).toContain(`UID:${event.id}@privaty-volleyball`);
});
it("keeps an unknown start time as a day rather than guessing an hour", () => {
  expect(calendar({ start_time: "a combinar" })).toContain("DTSTART;VALUE=DATE:20261118\r\n");
  for (const value of ["24:00", "19:61", "-1", ""]) expect(eventStartTime(value)).toBeNull();
  for (const value of ["19h", "19:00", "19"]) expect(eventStartTime(value)).toBe("19:00");
});
it("escapes text and folds UTF-8 without allowing injected calendar properties", () => {
  const result = calendar({ title: "Vôlei, amigos; " + "ação 🏐".repeat(20) + "\r\nATTENDEE:intruder", notes: "Traga água\\toalha" });
  for (const line of result.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  const unfolded = result.replace(/\r\n /g, "");
  expect(unfolded).toContain("SUMMARY:Vôlei\\, amigos\\;");
  expect(unfolded).toContain("\\nATTENDEE:intruder");
  expect(unfolded).not.toMatch(/\r\nATTENDEE:/);
  expect(unfolded).toContain("água\\\\toalha");
  expect(unfolded).not.toContain("�");
});

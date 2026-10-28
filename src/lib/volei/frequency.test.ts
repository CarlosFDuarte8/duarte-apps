import { describe, it, expect } from "vitest";
import {
  summarizeFrequency,
  preferenceForDate,
  preferencesSchema,
  type FrequencyEvent,
} from "./frequency";
import type { VoleiMember } from "./domain";
const member = (id: string, name: string): VoleiMember => ({
  id,
  name,
  token: "",
  points: 0,
  blocked: false,
  blocked_reason: "",
  is_active: true,
});
describe("Frequência real", () => {
  it("exclui confirmações não conferidas e convidados do ranking", () => {
    const events: FrequencyEvent[] = [
      {
        id: "1",
        date: "2026-10-21",
        title: "Vôlei",
        presence_closed_at: "done",
        attendance: [
          { member_id: "a", status: "confirmado", checked_in_at: "yes" },
          { member_id: "b", status: "ausente", checked_in_at: null },
        ],
        guests: [{ status: "confirmado", checked_in_at: "yes" }],
      },
      {
        id: "2",
        date: "2026-10-28",
        title: "Vôlei",
        presence_closed_at: null,
        attendance: [
          { member_id: "b", status: "confirmado", checked_in_at: "yes" },
        ],
        guests: [],
      },
    ];
    const report = summarizeFrequency(
      [member("a", "Ana"), member("b", "Bia")],
      events,
    );
    expect(report.completedGames).toBe(1);
    expect(report.pendingGames).toBe(1);
    expect(report.totalPresences).toBe(1);
    expect(report.guestPresences).toBe(1);
    expect(report.rows[0].member.id).toBe("a");
    expect(report.rows[0].percentage).toBe(100);
    expect(report.rows[1].presences).toBe(0);
    expect(report.rows[1].absences).toBe(1);
  });
  it("não confunde cancelamento e espera com faltas", () => {
    const report = summarizeFrequency(
      [member("a", "Ana")],
      [
        {
          id: "x",
          date: "2026-10-28",
          title: "",
          presence_closed_at: "ok",
          attendance: [
            { member_id: "a", status: "nao_vai", checked_in_at: null },
          ],
          guests: [],
        },
      ],
    );
    expect(report.rows[0].cancellations).toBe(1);
    expect(report.rows[0].absences).toBe(0);
    expect(
      summarizeFrequency([member("a", "Ana")], []).rows[0].percentage,
    ).toBe(0);
  });
  it("combina dias fixos, sábados avulsos e exceções", () => {
    const laura = {
      ...member("l", "Laura"),
      preferred_weekdays: [3],
      preferred_dates: ["2026-10-31"],
      unavailable_dates: ["2026-11-04"],
    };
    expect(preferenceForDate(laura, "2026-10-28")).toBe("Dia preferido");
    expect(preferenceForDate(laura, "2026-10-31")).toBe("Dia preferido");
    expect(preferenceForDate(laura, "2026-11-07")).toBe(
      "Sem preferência para este dia",
    );
    expect(preferenceForDate(laura, "2026-11-04")).toBe("Indisponível");
  });
  it("valida dias, datas reais e exceções incompatíveis", () => {
    const base = {
      is_core: true,
      preferred_weekdays: [3, 3],
      preferred_dates: [],
      unavailable_dates: [],
      preference_notes: "",
    };
    expect(preferencesSchema.parse(base).preferred_weekdays).toEqual([3]);
    expect(
      preferencesSchema.safeParse({ ...base, preferred_weekdays: [7] }).success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({ ...base, preferred_dates: ["2026-02-31"] })
        .success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({
        ...base,
        preferred_dates: ["2026-10-31"],
        unavailable_dates: ["2026-10-31"],
      }).success,
    ).toBe(false);
  });
});

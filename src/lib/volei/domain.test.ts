import { describe, expect, it } from "vitest";
import {
  buildWhatsAppText,
  daysInMonth,
  eventSchema,
  isEventOpen,
  shiftMonth,
  weekdayOf,
  type VoleiEvent,
} from "./domain";

const event: VoleiEvent = {
  id: "1",
  date: "2026-10-28",
  title: "Vôlei",
  start_time: "19h",
  location: "Quadra",
  notes: "",
  closed: false,
};

describe("domínio do vôlei", () => {
  it("monta o texto do WhatsApp em ordem alfabética", () => {
    const text = buildWhatsAppText(event, ["Zeca", "Ana"]);
    expect(text).toBe(
      "*Vôlei*\nQuarta, 28/10\nHorário: 19h\nLocal: Quadra\n\n01. Ana\n02. Zeca\n\nTotal: 2",
    );
  });
  it("avisa quando ninguém confirmou", () => {
    expect(buildWhatsAppText(event, [])).toContain("Ninguém confirmado ainda.");
  });
  it("calcula meses e dias", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(daysInMonth("2026-02")).toBe(28);
    expect(weekdayOf("2026-10-24")).toBe(6);
  });
  it("só aceita confirmar eventos abertos e futuros", () => {
    expect(isEventOpen(event, "2026-10-28")).toBe(true);
    expect(isEventOpen(event, "2026-10-29")).toBe(false);
    expect(isEventOpen({ ...event, closed: true }, "2026-10-01")).toBe(false);
  });
  it("valida datas dos eventos", () => {
    const base = { title: "x", start_time: "", location: "", notes: "" };
    expect(eventSchema.safeParse({ ...base, dates: ["2026-10-28"] }).success).toBe(true);
    expect(eventSchema.safeParse({ ...base, dates: ["28/10/2026"] }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, dates: [] }).success).toBe(false);
  });
});

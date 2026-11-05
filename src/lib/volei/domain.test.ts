import { describe, expect, it } from "vitest";
import {
  eventFreeSlots,
  buildWhatsAppText,
  daysInMonth,
  eventSchema,
  isEventOpen,
  shiftMonth,
  weekdayOf,
  type VoleiEvent,
} from "./domain";
import { buildGateList } from "./gate-list";

const event: VoleiEvent = {
  id: "1",
  date: "2026-10-28",
  title: "Vôlei",
  start_time: "19h",
  location: "Quadra",
  notes: "",
  closed: false,
};
it("desconta reservas e confirmados sem exibir vagas negativas", () => {
  expect(eventFreeSlots(event, 2, 1)).toBe(15);
  expect(eventFreeSlots(event, 18, 2)).toBe(0);
  expect(eventFreeSlots({ max_teams: 4 }, 18, 2)).toBe(4);
});

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
  it("inclui convidados após os membros, com responsável, numeração contínua e total", () => {
    const guests = [
      { name: "Zeca", responsible: "Carlos" },
      { name: "Ana", responsible: "Bruna" },
    ];
    const text = buildWhatsAppText(event, ["Carlos", "Bruna"], guests);
    expect(text).toContain(
      "01. Bruna\n02. Carlos\n\n*Convidados confirmados*\n03. Ana (convidado de Bruna)\n04. Zeca (convidado de Carlos)",
    );
    expect(text).toContain("Total: 4");
    expect(guests[0].name).toBe("Zeca");
  });
  it("não apresenta lista vazia quando apenas convidados estão confirmados", () => {
    const text = buildWhatsAppText(
      event,
      [],
      [{ name: "Visitante", responsible: "Carlos" }],
    );
    expect(text).not.toContain("Ninguém confirmado ainda.");
    expect(text).toContain("01. Visitante (convidado de Carlos)");
    expect(text).toContain("Total: 1");
  });
  it("não compartilha convidados em espera ou cancelados, nem vinculados a membro bloqueado", () => {
    const members = [
      {
        id: "sponsor",
        name: "Carlos",
        token: "",
        points: 0,
        blocked: false,
        blocked_reason: "",
        is_active: true,
        membership_status: "approved" as const,
      },
      {
        id: "blocked",
        name: "Bloqueado",
        token: "",
        points: 0,
        blocked: true,
        blocked_reason: "",
        is_active: true,
        membership_status: "approved" as const,
      },
    ];
    const guests = buildGateList(
      members,
      [],
      [
        {
          id: "a",
          member_id: "sponsor",
          name: "Confirmado",
          status: "confirmado",
        },
        { id: "b", member_id: "sponsor", name: "Espera", status: "espera" },
        { id: "c", member_id: "sponsor", name: "Cancelado", status: "nao_vai" },
        {
          id: "d",
          member_id: "blocked",
          name: "Indisponível",
          status: "confirmado",
        },
      ],
    );
    const text = buildWhatsAppText(event, ["Carlos"], guests);
    expect(text).toContain("02. Confirmado (convidado de Carlos)");
    expect(text).toContain("Total: 2");
    expect(text).not.toMatch(/Espera|Cancelado|Indisponível/);
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
    expect(
      eventSchema.safeParse({ ...base, dates: ["2026-10-28"] }).success,
    ).toBe(true);
    expect(
      eventSchema.safeParse({ ...base, dates: ["28/10/2026"] }).success,
    ).toBe(false);
    expect(eventSchema.safeParse({ ...base, dates: [] }).success).toBe(false);
  });
});

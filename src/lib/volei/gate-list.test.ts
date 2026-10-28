import { it, expect } from "vitest";
import { buildGateList } from "./gate-list";
import type { VoleiMember } from "./domain";
const member = (
  id: string,
  status: "approved" | "pending" = "approved",
): VoleiMember => ({
  id,
  name: id,
  token: "",
  points: 0,
  blocked: false,
  blocked_reason: "",
  is_active: true,
  membership_status: status,
});
it("a portaria admite só confirmados aprovados e convidados confirmados vinculados", () => {
  const rows = buildGateList(
    [member("Ana"), member("Reservado"), member("Pendente", "pending")],
    [
      { member_id: "Ana", status: "confirmado" },
      { member_id: "Reservado", status: "reservado" },
      { member_id: "Pendente", status: "confirmado" },
    ],
    [
      { id: "g1", member_id: "Ana", name: "Zeca", status: "confirmado" },
      { id: "g2", member_id: "Ana", name: "Espera", status: "espera" },
      {
        id: "g3",
        member_id: "Pendente",
        name: "Não aprovado",
        status: "confirmado",
      },
    ],
  );
  expect(rows.map((r) => r.name)).toEqual(["Ana", "Zeca"]);
  expect(rows[1].responsible).toBe("Ana");
});

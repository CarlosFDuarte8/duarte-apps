import { it, expect } from "vitest";
import { buildGateList } from "./gate-list";
import type { VoleiMember } from "./domain";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GateListTables } from "../../components/volei/gate-list-tables";
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

it("imprime membros antes dos convidados, com assinatura, campo livre e checkbox, sem coluna Tipo", () => {
  const members = [member("Zélia"), ...Array.from({ length: 9 }, (_, index) => member(`Membro ${index + 1}`))];
  const rows = buildGateList(
    members,
    members.map(person => ({ member_id: person.id, status: "confirmado" as const })),
    [
      { id: "guest", member_id: "Zélia", name: "Ana", status: "confirmado" },
      { id: "guest-2", member_id: "Membro 1", name: "Bia", status: "confirmado" },
    ],
  );
  const html = renderToStaticMarkup(createElement(GateListTables, { rows }));
  expect(html.indexOf("Zélia</td>")).toBeLessThan(html.indexOf("Ana<small>"));
  expect(html).toContain("Membros · 10");
  expect(html).toContain("Convidados · 2");
  expect(html).toContain("Preenchimento manual · 6");
  expect(html.indexOf("Convidados · 2")).toBeLessThan(html.indexOf("Preenchimento manual · 6"));
  expect(html).toContain("Assinatura");
  expect(html).toContain("Observações");
  expect(html).not.toContain("Tipo / responsável");
  expect(html.match(/class="gate-checkbox"/g)).toHaveLength(12);
  expect(html).toContain("Responsável: Zélia");
  expect(html.match(/data-slot="blank-print-row"/g)).toHaveLength(6);
  expect(html).toContain("<td>11</td>");
  expect(html).toContain("<td>18</td>");
  expect(html).not.toContain("<td>19</td>");
});

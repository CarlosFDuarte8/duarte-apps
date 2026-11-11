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
  const rows = buildGateList(
    [member("Zélia")],
    [{ member_id: "Zélia", status: "confirmado" }],
    [{ id: "guest", member_id: "Zélia", name: "Ana", status: "confirmado" }],
  );
  const html = renderToStaticMarkup(createElement(GateListTables, { rows }));
  expect(html.indexOf("Zélia</td>")).toBeLessThan(html.indexOf("Ana<small>"));
  expect(html).toContain("Membros · 1");
  expect(html).toContain("Convidados · 1");
  expect(html).toContain("Assinatura");
  expect(html).toContain("Observações");
  expect(html).not.toContain("Tipo / responsável");
  expect(html.match(/class="gate-checkbox"/g)).toHaveLength(2);
  expect(html).toContain("Responsável: Zélia");
  expect(html).toContain("<td>2</td>");
});

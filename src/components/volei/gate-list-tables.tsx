import type { buildGateList } from "@/lib/volei/gate-list";
import * as React from "react";

type Rows = ReturnType<typeof buildGateList>;

export function GateListTables({ rows }: { rows: Rows }) {
  const members = rows.filter((row) => row.type === "Membro");
  const guests = rows.filter((row) => row.type === "Convidado");
  function section(title: string, people: Rows, offset: number) {
    return (
      <table>
        <caption>
          {title} · {people.length}
        </caption>
        <colgroup>
          <col className="gate-number-col" />
          <col className="gate-name-col" />
          <col className="gate-signature-col" />
          <col className="gate-notes-col" />
          <col className="gate-check-col" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Nº</th>
            <th scope="col">Nome completo</th>
            <th scope="col">Assinatura</th>
            <th scope="col">Observações</th>
            <th scope="col" className="gate-check-heading">
              Conf.
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map((person, index) => (
            <tr key={person.key}>
              <td>{offset + index + 1}</td>
              <td>
                {person.name}
                {person.type === "Convidado" && (
                  <small>Responsável: {person.responsible}</small>
                )}
              </td>
              <td aria-label="Espaço para assinatura">&nbsp;</td>
              <td aria-label="Campo livre para observações">&nbsp;</td>
              <td className="gate-check">
                <span
                  className="gate-checkbox"
                  aria-label="Conferência de entrada"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <>
      {members.length > 0 && section("Membros", members, 0)}
      {guests.length > 0 && section("Convidados", guests, members.length)}
    </>
  );
}

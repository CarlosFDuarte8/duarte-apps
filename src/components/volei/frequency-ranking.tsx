"use client";
import { useState } from "react";
import type { summarizeFrequency } from "@/lib/volei/frequency";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
export function FrequencyRanking({
  report,
}: {
  report: ReturnType<typeof summarizeFrequency>;
}) {
  const [search, setSearch] = useState("");
  const [core, setCore] = useState(false);
  const rows = report.rows
    .map((row, i) => ({ ...row, rank: i + 1 }))
    .filter(
      (row) =>
        row.member.name
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")) &&
        (!core || row.member.is_core),
    );
  return (
    <section className="volley-card">
      <header className="vm-section-head">
        <div>
          <span className="game-kicker">PRESENÇA REAL, NÃO CONFIRMAÇÃO</span>
          <h2>Quem mais participa</h2>
        </div>
        <span className="vm-hint">
          {report.completedGames} jogos conferidos
        </span>
      </header>
      <div className="vm-ranking-filters">
        <Input
          type="search"
          aria-label="Buscar no ranking"
          placeholder="Buscar participante"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <NativeSelect
          value={core ? "core" : "all"}
          onChange={(e) => setCore(e.target.value === "core")}
          aria-label="Filtrar grupo do ranking"
        >
          <option value="all">Todos os membros</option>
          <option value="core">Grupo principal</option>
        </NativeSelect>
      </div>
      {!report.completedGames ? (
        <div className="vm-empty">
          <h3>A frequência começa com a chamada</h3>
          <p>
            Confira a presença de um jogo abaixo e conclua a chamada para
            começar o ranking. Confirmações antecipadas não contam como
            comparecimento.
          </p>
        </div>
      ) : (
        <>
          <div className="vm-ranking">
            <div className="vm-ranking-head">
              <span>Participante</span>
              <span>Presenças</span>
              <span>Faltas</span>
              <span>Participação</span>
            </div>
            {rows.map((row) => (
              <article key={row.member.id} className="vm-ranking-row">
                <div className="vm-ranking-person">
                  <span className="vm-rank">
                    {String(row.rank).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{row.member.name}</strong>
                    <div className="vm-ranking-tags">
                      {row.member.is_core && <Badge>Grupo principal</Badge>}
                      {!row.member.is_active && (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </div>
                    <small>
                      {row.lastSeen
                        ? `Última presença: ${row.lastSeen.split("-").reverse().join("/")}`
                        : "Sem presença no período"}
                    </small>
                  </div>
                </div>
                <div className="vm-ranking-number">
                  <span>Presenças</span>
                  <strong>{row.presences}</strong>
                </div>
                <div className="vm-ranking-number">
                  <span>Faltas</span>
                  <strong>{row.absences}</strong>
                </div>
                <div className="vm-participation">
                  <strong>{row.percentage}%</strong>
                  <progress
                    max={report.completedGames}
                    value={row.presences}
                    aria-label={`${row.member.name}: ${row.presences} de ${report.completedGames} jogos`}
                  />
                  <small>
                    {row.presences} de {report.completedGames} jogos
                  </small>
                </div>
              </article>
            ))}
          </div>
          {!rows.length && (
            <p className="vm-hint">Nenhum participante encontrado.</p>
          )}
          <p className="vm-hint">
            Participação = presenças ÷ jogos conferidos no período. O ranking
            ordena pelo total de presenças; em empate, por menos faltas e nome.
            Convidados ficam fora do ranking de membros.
          </p>
        </>
      )}
    </section>
  );
}

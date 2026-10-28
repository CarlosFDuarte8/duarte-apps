import Link from "next/link";
import { requireVoleiAdmin as requireAdmin } from "@/lib/volei/auth";
import { PageHeader } from "@/components/escalas/admin-ui";
import { EventCreator } from "@/components/volei/event-creator";
import { listEvents } from "@/lib/volei/repository";
import {
  currentMonth,
  formatDate,
  formatMonth,
  monthPattern,
  shiftMonth,
  eventCapacity,
} from "@/lib/volei/domain";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const month = mes && monthPattern.test(mes) ? mes : currentMonth();
  const { client } = await requireAdmin();
  const events = await listEvents(client, month);
  return (
    <>
      <section className="volley-hero">
        <span className="volley-eyebrow">SEU GRUPO, SUA QUADRA</span>
        <h1>Tudo pronto para jogar.</h1>
        <p>
          Cadastre os membros, organize os encontros e compartilhe o link de
          cada jogo. A lista de espera cuida da próxima vaga.
        </p>
        <Link className="volley-link" href="/volei">
          Abrir área pública →
        </Link>
      </section>
      <PageHeader
        eyebrow="Vôlei"
        title={formatMonth(month)}
        description="Defina os dias de jogo e acompanhe as confirmações."
        actions={
          <>
            <Link
              className="sc-button sc-btn-ghost"
              href={`/admin/volei?mes=${shiftMonth(month, -1)}`}
            >
              ← Anterior
            </Link>
            <Link
              className="sc-button sc-btn-ghost"
              href={`/admin/volei?mes=${shiftMonth(month, 1)}`}
            >
              Próximo →
            </Link>
            <Link className="sc-button" href="/admin/volei/membros">
              Membros e pontos
            </Link>
          </>
        }
      />
      <EventCreator key={month} month={month} />
      <section className="sc-card sc-form-card">
        <h2>Dias do mês</h2>
        {events.length === 0 ? (
          <p>Nenhum dia cadastrado neste mês.</p>
        ) : (
          <table className="sc-table">
            <thead>
              <tr>
                <th>Dia</th>
                <th>Confirmados</th>
                <th>Reservadas</th>
                <th>Não vão</th>
                <th>Vagas livres</th>
                <th>Membros na fila</th>
                <th>Convidados na fila</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map(
                ({
                  event,
                  confirmed,
                  declined,
                  waiting,
                  guestsWaiting,
                  reserved,
                }) => (
                  <tr key={event.id}>
                    <td data-label="Dia">
                      {formatDate(event.date)}
                      {event.closed && (
                        <span className="sc-badge sc-badge-muted">
                          {" "}
                          Fechado
                        </span>
                      )}
                    </td>
                    <td data-label="Confirmados">{confirmed}</td>
                    <td data-label="Reservadas">{reserved}</td>
                    <td data-label="Não vão">{declined}</td>
                    <td data-label="Vagas livres">
                      {Math.max(0, eventCapacity(event) - confirmed - reserved)}
                    </td>
                    <td data-label="Membros na fila">{waiting}</td>
                    <td data-label="Convidados na fila">{guestsWaiting}</td>
                    <td data-label="Jogo">
                      <Link href={`/admin/volei/${event.id}`}>Abrir</Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

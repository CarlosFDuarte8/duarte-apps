import Link from "next/link";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { today, currentMonth, formatDate } from "@/lib/volei/domain";
import { listMembers, frequencyEvents } from "@/lib/volei/repository";
import { summarizeFrequency } from "@/lib/volei/frequency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FrequencyRanking } from "@/components/volei/frequency-ranking";
import "@/components/volei/management.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const params = await searchParams;
  const now = today();
  const schema = z
    .object({ from: z.iso.date(), to: z.iso.date() })
    .refine(
      (p) =>
        p.from <= p.to &&
        p.to <= now &&
        (Date.parse(p.to) - Date.parse(p.from)) / 86400000 <= 366,
    );
  const parsed = schema.safeParse({
    from: params.from ?? `${currentMonth()}-01`,
    to: params.to ?? now,
  });
  const range = parsed.success
    ? parsed.data
    : { from: `${currentMonth()}-01`, to: now };
  const [members, events] = await Promise.all([
    listMembers(client),
    frequencyEvents(client, range.from, range.to),
  ]);
  const report = summarizeFrequency(members, events);
  return (
    <>
      <section className="volley-hero">
        <span className="volley-eyebrow">QUEM FAZ O JOGO ACONTECER</span>
        <h1>Frequência do grupo</h1>
        <p>
          Confira quem compareceu de verdade. Acompanhe presenças, faltas e a
          participação de cada membro, sem punições automáticas.
        </p>
      </section>
      <form className="volley-card vm-period" action="/admin/volei/frequencia">
        <label>
          De
          <Input
            type="date"
            name="from"
            defaultValue={range.from}
            max={now}
            required
          />
        </label>
        <label>
          Até
          <Input
            type="date"
            name="to"
            defaultValue={range.to}
            max={now}
            required
          />
        </label>
        <Button type="submit">Aplicar período</Button>
        {!parsed.success && (
          <p role="alert">
            Escolha um período de até um ano, sem datas futuras.
          </p>
        )}
      </form>
      <div className="vm-metrics">
        <div>
          <strong>{report.completedGames}</strong>
          <span>Jogos conferidos</span>
        </div>
        <div>
          <strong>{report.totalPresences}</strong>
          <span>Presenças de membros</span>
        </div>
        <div>
          <strong>{report.totalAbsences}</strong>
          <span>Faltas sem cancelamento</span>
        </div>
        <div>
          <strong>{report.pendingGames}</strong>
          <span>Chamadas pendentes</span>
        </div>
      </div>
      <FrequencyRanking report={report} />
      <section className="volley-card">
        <header className="vm-section-head">
          <div>
            <h2>Chamada dos jogos</h2>
            <p className="vm-hint">
              Marque quem compareceu e conclua a chamada. Confirmados sem
              check-in serão registrados como ausentes.
            </p>
          </div>
          <Badge>{report.guestPresences} presenças de convidados</Badge>
        </header>
        <div className="vm-events">
          {events.map((event) => (
            <article key={event.id}>
              <div>
                <strong>{formatDate(event.date)}</strong>
                <p>{event.title}</p>
              </div>
              <Badge variant={event.presence_closed_at ? "default" : "outline"}>
                {event.presence_closed_at ? "Conferido" : "Pendente"}
              </Badge>
              <Button asChild variant="outline">
                <Link href={`/admin/volei/frequencia/${event.id}`}>
                  {event.presence_closed_at
                    ? "Ver / corrigir chamada"
                    : "Conferir presença"}
                </Link>
              </Button>
            </article>
          ))}
          {!events.length && (
            <p className="vm-hint">
              Nenhum jogo neste período. Cadastre os encontros no painel de
              jogos.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

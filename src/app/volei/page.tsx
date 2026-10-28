import Link from "next/link";
import { publicEvents } from "@/lib/volei/repository";
import { currentMonth, formatDate, today } from "@/lib/volei/domain";
export const dynamic = "force-dynamic";
export default async function Page() {
  const months = [
    currentMonth(),
    (() => {
      const [y, m] = currentMonth().split("-").map(Number);
      return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
    })(),
  ];
  const events = (
    await Promise.all(months.map((m) => publicEvents(m, today())))
  ).flat();
  return (
    <>
      <section className="volley-hero">
        <span className="volley-eyebrow">O PRÓXIMO JOGO COMEÇA AQUI</span>
        <h1>Seu lugar na quadra.</h1>
        <p>
          Acompanhe os confirmados, veja as vagas disponíveis e entre na próxima
          partida. São 18 jogadores, em 3 times de 6.
        </p>
      </section>
      <div className="volley-grid">
        {events.map(({ event, attendance, guests }) => {
          const confirmed =
            attendance.filter((p) => p.status === "confirmado").length +
            guests.filter((p) => p.status === "confirmado").length;
          return (
            <article className="volley-card" key={event.id}>
              <span className="volley-muted">{formatDate(event.date)}</span>
              <h2>{event.title}</h2>
              <p className="volley-muted">
                {[event.start_time, event.location]
                  .filter(Boolean)
                  .join(" · ") || "Detalhes em breve"}
              </p>
              <div className="volley-stats">
                <div className="volley-stat">
                  <strong>{confirmed}</strong>
                  <span>Confirmados</span>
                </div>
                <div className="volley-stat">
                  <strong>
                    {Math.max(
                      0,
                      18 -
                        confirmed -
                        attendance.filter((p) => p.status === "reservado")
                          .length,
                    )}
                  </strong>
                  <span>Vagas livres</span>
                </div>
                <div className="volley-stat">
                  <strong>
                    {guests.filter((g) => g.status === "espera").length}
                  </strong>
                  <span>Convidados na fila</span>
                </div>
              </div>
              <Link className="volley-link" href={`/volei/jogo/${event.id}`}>
                {event.closed ? "Consultar lista" : "Ver jogo e confirmar →"}
              </Link>
            </article>
          );
        })}
      </div>
      {!events.length && (
        <section className="volley-card">
          <h2>A quadra está sendo preparada</h2>
          <p className="volley-muted">
            Nenhum jogo cadastrado para este mês e o próximo. Volte em breve.
          </p>
        </section>
      )}
    </>
  );
}

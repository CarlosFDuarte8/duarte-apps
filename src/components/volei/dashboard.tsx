import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Users,
  Activity,
  Bell,
  ShieldCheck,
  UserRound,
  Plus,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VolleyCard, VolleyHero, VolleyPageHeader } from "./page-frame";
import { VolleyMetric, VolleyMetrics } from "./metric";
import { EventCard, type EventSummary } from "./event-card";
import { ShareGameButton } from "./share-game-button";
import {
  eventFreeSlots,
  isEventOpen,
  formatDate,
  formatMonth,
  shiftMonth,
  today,
} from "@/lib/volei/domain";
import "./dashboard.css";
import type { ReactNode } from "react";
import type { AttendanceStatus } from "@/lib/volei/domain";
import { EventLinks } from "./event-links";
export function VolleyDashboard({
  items,
  admin = false,
  month,
  creator,
  groupInvite,
  personal,
  tasks,
}: {
  items: EventSummary[];
  admin?: boolean;
  month: string;
  creator?: ReactNode;
  groupInvite?: ReactNode;
  tasks?: ReactNode;
  personal?: { name: string; membershipStatus: string; available: boolean; statuses: Record<string, AttendanceStatus>; positions: Record<string, number | null> } | null;
}) {
  const upcoming = items.find(
    (item) => item.event.date >= today() && (admin ? !item.event.closed : !item.event.presence_closed_at),
  );
  const next = upcoming?.event;
  const ownStatus = next ? personal?.statuses[next.id] : undefined;
  const personalMessage = personal
    ? personal.membershipStatus !== "approved" ? personal.membershipStatus === "pending" ? "Seu cadastro está aguardando aprovação." : "Seu cadastro não foi aprovado. Fale com o responsável."
      : !personal.available ? "Seu cadastro está indisponível para novas inscrições."
      : ownStatus === "confirmado" ? "Você está confirmado para este encontro."
      : ownStatus === "espera" ? `Você está na lista de espera deste encontro.${next && personal.positions[next.id] ? ` Posição atual: ${personal.positions[next.id]}º na fila de membros.` : ""}`
      : upcoming?.admission && !upcoming.admission.open ? upcoming.admission.message
      : next && isEventOpen(next) ? "Você ainda não confirmou sua presença."
      : next ? "As inscrições encerraram. Consulte sua participação."
      : "Assim que houver um novo encontro, ele aparecerá aqui."
    : null;
  const other = items.filter((item) => item.event.id !== next?.id);
  const occupied = upcoming?.confirmed ?? 0;
  const free = next
    ? eventFreeSlots(next, occupied, upcoming?.reserved ?? 0)
    : 0;
  const quick = admin
    ? [
        {
          href: "/admin/volei/membros",
          title: "Membros",
          text: "Cadastros e aprovações",
          icon: Users,
        },
        {
          href: "/admin/volei/frequencia",
          title: "Frequência",
          text: "Quem está sempre na quadra",
          icon: Activity,
        },
        {
          href: "/admin/volei/notificacoes",
          title: "Solicitações",
          text: "Pendências para acompanhar",
          icon: Bell,
        },
        {
          href: "/admin/volei/configuracoes",
          title: "Grupo do WhatsApp",
          text: "Link público e QR code",
          icon: MessageCircle,
        },
      ]
    : [
        {
          href: "/volei/meu-cadastro",
          title: "Meu cadastro",
          text: "Foto, telefone e seus dados",
          icon: UserRound,
        },
        {
          href: "/volei/ajuda",
          title: "Como participar",
          text: "Tudo o que você precisa saber",
          icon: ShieldCheck,
        },
      ];
  return (
    <div className={`vx-dashboard${admin ? "" : " vx-dashboard-public"}`}>
      {admin ? (
        <VolleyPageHeader eyebrow="SEU PAINEL DE CONTROLE" title="Visão geral" description="Acompanhe a próxima partida e organize o que vem depois." actions={
          <Button asChild variant="outline">
            <Link href="/volei">
              Área pública
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        } />
      ) : (
        <VolleyHero
          id="volley-games-title"
          eyebrow="VÔLEI DA GALERA"
          title="Jogos e presenças"
          description="Escolha seu jogo. Confirme a presença. A gente se vê na quadra."
          compact
          mobileCompact
        />
      )}
      {tasks}
      <VolleyMetrics aria-label="Resumo dos encontros" mobileCompact={!admin}>
        {[
          { label: "Encontros", value: items.length, detail: admin ? formatMonth(month) : "Na agenda", icon: CalendarDays, tone: "blue" },
          { label: "Confirmados", value: occupied, detail: "No próximo encontro", icon: Users, tone: "green" },
          { label: "Vagas livres", value: free, detail: next ? "No próximo encontro" : "Sem encontro agendado", icon: ShieldCheck, tone: "blue" },
          { label: "Na espera", value: (upcoming?.waiting ?? 0) + (upcoming?.guestsWaiting ?? 0), detail: "Membros e convidados", icon: Clock3, tone: "amber" },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <VolleyMetric key={label} className="vx-overview-stat" label={label} value={value} detail={detail} icon={<Icon />} tone={tone as "blue" | "green" | "amber"} />
        ))}
      </VolleyMetrics>
      <div className="vx-dashboard-columns">
        <div className="vx-main-column">
          <section
            className={`vx-feature${!next ? " vx-feature-empty" : ""}`}
            id={next ? `encontro-${next.id}` : undefined}
            aria-label="Próximo encontro"
          >
            <div className="vx-feature-body">
              <span className="vx-live-label">
                <i />
                {next?.date === today() ? "É HOJE!" : "PRÓXIMO ENCONTRO"}
              </span>
              <h2>{next ? next.title : "A próxima partida está por vir."}</h2>
              {!admin && personal && <p className="vx-feature-description" data-slot="personal-game-status"><strong>Olá, {personal.name.split(" ")[0]}!</strong> {personalMessage}</p>}
              {!admin && !personal && upcoming?.admission && <p className="vx-feature-description">{upcoming.admission.message}</p>}
              {next ? (
                <>
                  <div className="vx-feature-meta">
                    <span><CalendarDays aria-hidden="true" />{formatDate(next.date)}</span>
                    {next.start_time && (
                      <span>
                        <Clock3 aria-hidden="true" />
                        {next.start_time}
                      </span>
                    )}
                    {next.location && (
                      <span>
                        <MapPin aria-hidden="true" />
                        {next.location}
                      </span>
                    )}
                  </div>
                  <div className="vx-feature-actions">
                    <Button asChild>
                      <Link
                        href={
                          admin
                            ? `/admin/volei/${next.id}/quadra`
                            : `/volei/jogo/${next.id}#minha-presenca`
                        }
                      >
                        {admin
                          ? "Abrir quadra e times"
                          : ownStatus === "confirmado" ? "Gerenciar minha presença"
                          : ownStatus === "espera" ? "Acompanhar minha posição"
                          : personal && (personal.membershipStatus !== "approved" || !personal.available) ? "Consultar minha situação"
                          : upcoming?.admission && !upcoming.admission.open ? upcoming.admission.state === "review" ? "Conferir dados para participar" : "Consultar minha inscrição"
                          : isEventOpen(next)
                            ? "Confirmar minha presença"
                            : "Ver lista do encontro"}
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </Button>
                    <ShareGameButton id={next.id} />
                  </div>
                  {!admin && <EventLinks event={next} inverse />}
                  <p className="vx-feature-foot">
                    <Users aria-hidden="true" />
                    <strong>{occupied} confirmados</strong>
                    <span>·</span>
                    {free > 0
                      ? `${free} vagas disponíveis`
                      : "Lista cheia · acompanhe a espera"}
                  </p>
                </>
              ) : (
                <>
                  <p className="vx-feature-description">
                    {admin
                      ? "Escolha os dias, convide a turma e deixe o resto com a lista."
                      : "Assim que um novo encontro for marcado, ele aparece por aqui."}
                  </p>
                  {admin && (
                    <Button asChild variant="outline" data-tone="inverse"><a className="vx-feature-text-link" href="#agendar-jogos">
                      Agendar um encontro
                      <ArrowRight aria-hidden="true" />
                    </a></Button>
                  )}
                </>
              )}
            </div>
          </section>
          {next && admin && (
            <Link className="vx-match-manage" href={`/admin/volei/${next.id}`}>
              <span>Inscrições, convidados e lista da portaria</span>
              <span>
                Gerenciar encontro
                <ArrowRight aria-hidden="true" />
              </span>
            </Link>
          )}
          <VolleyCard className="vx-agenda-section" aria-labelledby="volley-agenda-title">
            <header className="vx-agenda-head">
              <div>
                <span className="vx-eyebrow">
                  <CalendarDays aria-hidden="true" />
                  {admin ? "PLANEJE OS PRÓXIMOS DIAS" : "PRÓXIMOS ENCONTROS"}
                </span>
                <h2 id="volley-agenda-title">{admin ? "Agenda da quadra" : "Mais encontros"}</h2>
              </div>
              {admin && (
                <div className="vx-agenda-month">
                  <span>{formatMonth(month)}</span>
                  <Button asChild variant="ghost" aria-label="Mês anterior">
                    <Link href={`/admin/volei?mes=${shiftMonth(month, -1)}`}>
                      <ChevronLeft aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" aria-label="Próximo mês">
                    <Link href={`/admin/volei?mes=${shiftMonth(month, 1)}`}>
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              )}
              {!admin && other.length > 0 && (
                <Button asChild variant="outline">
                  <a href="#lista-encontros"><CalendarDays aria-hidden="true" />Ver agenda completa<ArrowRight aria-hidden="true" /></a>
                </Button>
              )}
            </header>
            {items.length > 0 && (
              <nav className="vx-date-track" aria-label="Ir para um encontro">
                {items.map(({ event }) => {
                  const date = new Date(`${event.date}T12:00:00Z`);
                  return (
                    <a
                      key={event.id}
                      href={`#encontro-${event.id}`}
                      className={next?.id === event.id ? "is-next" : ""}
                    >
                      <span>
                        {new Intl.DateTimeFormat("pt-BR", {
                          weekday: "short",
                          timeZone: "UTC",
                        })
                          .format(date)
                          .replace(".", "")}
                      </span>
                      <strong>{event.date.slice(-2)}</strong>
                      <small>
                        {new Intl.DateTimeFormat("pt-BR", {
                          month: "short",
                          timeZone: "UTC",
                        })
                          .format(date)
                          .replace(".", "")}
                      </small>
                      {!event.closed && <i />}
                    </a>
                  );
                })}
              </nav>
            )}
            {creator && (
              <details className="vx-schedule" key={month}>
                <summary>
                  <span>
                    <Plus aria-hidden="true" />
                    Agendar jogos
                  </span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <div id="agendar-jogos">{creator}</div>
              </details>
            )}
            <div className="vx-event-list" id="lista-encontros" tabIndex={-1}>
              {other.map((item) => (
                <EventCard key={item.event.id} {...item} admin={admin} />
              ))}
            </div>
            {!other.length && (
              <div className="vx-agenda-empty">
                <CalendarDays aria-hidden="true" />
                <div>
                  <strong>
                    {next
                      ? "Todos os próximos encontros estão aí em cima."
                      : "Agenda aberta para novos encontros."}
                  </strong>
                  <p>
                    {admin
                      ? "Os jogos agendados neste mês ficam reunidos aqui."
                      : "Volte por aqui para acompanhar os novos dias de jogo."}
                  </p>
                </div>
              </div>
            )}
          </VolleyCard>
        </div>
        <aside className="vx-side-column">
          {groupInvite}
          <VolleyCard className="vx-tools" aria-labelledby="volley-tools-title">
            <header>
              <span className="vx-tool-icon">
                <Users aria-hidden="true" />
              </span>
              <div>
                <span className="vx-eyebrow">{admin ? "GESTÃO DO GRUPO" : "SEU ESPAÇO NO GRUPO"}</span>
                <h2 id="volley-tools-title">{admin ? "Cuide do seu grupo" : "Seu espaço no grupo"}</h2>
              </div>
            </header>
            <div className="vx-shortcuts">
              {quick.map(({ href, title, text, icon: Icon }) => (
                <Link href={href} key={href}>
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </div>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </VolleyCard>
          {admin ? (
            <VolleyCard className="vx-month-summary">
              <span className="vx-eyebrow">
                EM {formatMonth(month).toLocaleUpperCase("pt-BR")}
              </span>
              <h2>O mês em números.</h2>
              <dl>
                <div>
                  <dt>Encontros agendados</dt>
                  <dd>{items.length}</dd>
                </div>
                <div>
                  <dt>Confirmações</dt>
                  <dd>
                    {items.reduce((sum, item) => sum + item.confirmed, 0)}
                  </dd>
                </div>
                <div>
                  <dt>Pessoas na espera</dt>
                  <dd>
                    {items.reduce(
                      (sum, item) =>
                        sum + (item.waiting ?? 0) + (item.guestsWaiting ?? 0),
                      0,
                    )}
                  </dd>
                </div>
              </dl>
              <p>Uma pessoa pode participar de mais de um encontro.</p>
            </VolleyCard>
          ) : (
            <VolleyCard className="vx-how" aria-labelledby="volley-how-title">
              <span className="vx-eyebrow">SIMPLES ASSIM</span>
              <h2 id="volley-how-title">Da lista para a quadra.</h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <strong>Escolha o encontro</strong>
                    <p>Veja a data, o local e as vagas.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Use seu telefone</strong>
                    <p>O mesmo número do seu cadastro.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Confirme a presença</strong>
                    <p>Se os planos mudarem, avise por lá.</p>
                  </div>
                </li>
              </ol>
            </VolleyCard>
          )}
        </aside>
      </div>
    </div>
  );
}

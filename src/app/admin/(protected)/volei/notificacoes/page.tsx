import Link from "next/link";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import {
  listComplaints,
  notificationSummary,
} from "@/lib/volei/complaint-repository";
import { complaintStatuses } from "@/lib/volei/complaints";
import { displayPhone } from "@/lib/volei/phone";
import { signPhotos } from "@/lib/volei/photos";
import { PageHeader } from "@/components/escalas/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/volei/person-avatar";
import { MembershipRequestActions } from "@/components/volei/membership-request-actions";
import "@/components/volei/notifications.css";
const timestamp = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; estado?: string; pagina?: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const params = await searchParams;
  const type = ["cadastros", "queixas"].includes(params.tipo ?? "")
    ? params.tipo
    : "todos";
  const resolved = params.estado === "concluidas";
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .safeParse(params.pagina ?? 1);
  const current = page.success ? page.data : 1;
  const [summary, complaints, pending] = await Promise.all([
    notificationSummary(client),
    listComplaints(client, resolved, current),
    client
      .from("volei_members")
      .select("id,name,phone,photo_path,created_at")
      .eq("membership_status", "pending")
      .order("created_at"),
  ]);
  if (pending.error)
    throw Error("Não foi possível carregar os cadastros pendentes.");
  const members = await signPhotos(pending.data ?? []);
  const href = (next: number) =>
    `/admin/volei/notificacoes?tipo=${type}&estado=${resolved ? "concluidas" : "pendentes"}&pagina=${next}`;
  return (
    <>
      <PageHeader
        eyebrow="Vôlei"
        title="Central de solicitações"
        description="Cadastros e relatos que precisam da sua atenção. O sininho mantém a contagem até cada atendimento ser concluído."
      />
      <div className="vn-summary">
        <Link href="/admin/volei/notificacoes?tipo=cadastros">
          <strong>{summary.pendingMembers}</strong>
          <span>Cadastros pendentes</span>
        </Link>
        <Link href="/admin/volei/notificacoes?tipo=queixas">
          <strong>{summary.openComplaints}</strong>
          <span>Queixas pendentes</span>
        </Link>
        <div>
          <strong>{summary.unreadComplaints}</strong>
          <span>Queixas não lidas</span>
        </div>
      </div>
      <nav className="vn-tabs" aria-label="Filtrar solicitações">
        {[
          ["todos", "Todas"],
          ["cadastros", "Cadastros"],
          ["queixas", "Queixas"],
        ].map(([value, label]) => (
          <Button
            key={value}
            asChild
            variant={type === value ? "default" : "outline"}
          >
            <Link
              href={`/admin/volei/notificacoes?tipo=${value}`}
              aria-current={type === value ? "page" : undefined}
            >
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      {(type === "todos" || type === "cadastros") && (
        <section className="volley-card vn-section">
          <h2>Novos membros</h2>
          <p className="vn-help">
            Aprove ou recuse cada solicitação para retirá-la das pendências.
          </p>
          {members.map((member) => (
            <article key={member.id} className="vn-member-request">
              <div className="vn-request-person">
                <PersonAvatar name={member.name} photoUrl={member.photo_url} />
                <div>
                  <h3>
                    <Link href={`/admin/volei/membros/${member.id}`}>
                      {member.name}
                    </Link>
                  </h3>
                  <p>
                    {member.phone
                      ? displayPhone(member.phone)
                      : "Telefone não informado"}{" "}
                    · {timestamp.format(new Date(member.created_at))}
                  </p>
                </div>
              </div>
              <MembershipRequestActions id={member.id} />
            </article>
          ))}
          {!members.length && (
            <p className="vn-empty">Nenhum cadastro aguardando aprovação.</p>
          )}
        </section>
      )}
      {(type === "todos" || type === "queixas") && (
        <section className="volley-card vn-section">
          <header className="vn-section-heading">
            <h2>Queixas e relatos</h2>
            <nav className="vn-tabs" aria-label="Situação dos relatos">
              <Link
                href={`/admin/volei/notificacoes?tipo=${type}&estado=pendentes`}
                aria-current={!resolved ? "page" : undefined}
              >
                Pendentes
              </Link>
              <Link
                href={`/admin/volei/notificacoes?tipo=${type}&estado=concluidas`}
                aria-current={resolved ? "page" : undefined}
              >
                Concluídas
              </Link>
            </nav>
          </header>
          {complaints.items.map((item) => (
            <Link
              key={item.id}
              className="vn-complaint-row"
              href={`/admin/volei/notificacoes/${item.id}`}
            >
              <div>
                <div className="vn-row-badges">
                  <Badge variant="outline">
                    {complaintStatuses[item.status]}
                  </Badge>
                  {!item.read_at && <Badge>Não lida</Badge>}
                </div>
                <h3>{item.title}</h3>
                <p>
                  Sobre {item.target_name} ·{" "}
                  {item.target_type === "member" ? "Membro" : "Convidado"}
                </p>
                <small>
                  Enviado por {item.reporter_name} ·{" "}
                  {timestamp.format(new Date(item.created_at))}
                </small>
              </div>
              <span className="vn-open-label">Abrir →</span>
            </Link>
          ))}
          {!complaints.items.length && (
            <p className="vn-empty">
              {resolved
                ? "Nenhum relato concluído nesta página."
                : "Nenhuma queixa aguardando atendimento."}
            </p>
          )}
          <footer className="vn-pagination">
            <span>
              {complaints.total} relatos · página {current}
            </span>
            <div>
              {current > 1 && (
                <Button asChild variant="outline">
                  <Link href={href(current - 1)}>Anterior</Link>
                </Button>
              )}
              {current * 20 < complaints.total && (
                <Button asChild variant="outline">
                  <Link href={href(current + 1)}>Próxima</Link>
                </Button>
              )}
            </div>
          </footer>
        </section>
      )}
    </>
  );
}

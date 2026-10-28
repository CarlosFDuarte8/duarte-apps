import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import {
  getComplaint,
  complaintHistory,
} from "@/lib/volei/complaint-repository";
import {
  complaintStatuses,
  type ComplaintStatus,
} from "@/lib/volei/complaints";
import { formatDate } from "@/lib/volei/domain";
import { PageHeader } from "@/components/escalas/admin-ui";
import { Badge } from "@/components/ui/badge";
import { ComplaintReview } from "@/components/volei/complaint-review";
import "@/components/volei/notifications.css";
const timestamp = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const complaint = await getComplaint(client, id);
  if (!complaint) notFound();
  const history = await complaintHistory(client, id);
  const targetHref =
    complaint.target_type === "member" && complaint.target_member_id
      ? `/admin/volei/membros/${complaint.target_member_id}`
      : complaint.target_guest_id
        ? `/admin/volei/convidados/${complaint.target_guest_id}`
        : null;
  return (
    <>
      <PageHeader
        eyebrow="Vôlei · Atendimento privado"
        title={complaint.title}
        actions={
          <Link
            className="sc-button sc-btn-ghost"
            href="/admin/volei/notificacoes?tipo=queixas"
          >
            ← Voltar às solicitações
          </Link>
        }
      />
      <section className="volley-card vn-section">
        <Badge variant="outline">{complaintStatuses[complaint.status]}</Badge>
        <dl className="vn-complaint-meta">
          <div>
            <dt>Enviado por</dt>
            <dd>
              {complaint.reporter_id ? (
                <Link href={`/admin/volei/membros/${complaint.reporter_id}`}>
                  {complaint.reporter_name}
                </Link>
              ) : (
                complaint.reporter_name
              )}
            </dd>
          </div>
          <div>
            <dt>Sobre</dt>
            <dd>
              {targetHref ? (
                <Link href={targetHref}>{complaint.target_name}</Link>
              ) : (
                complaint.target_name
              )}{" "}
              · {complaint.target_type === "member" ? "Membro" : "Convidado"}
            </dd>
          </div>
          {complaint.sponsor_name && (
            <div>
              <dt>Membro responsável pelo convidado</dt>
              <dd>{complaint.sponsor_name}</dd>
            </div>
          )}
          <div>
            <dt>Recebido em</dt>
            <dd>{timestamp.format(new Date(complaint.created_at))}</dd>
          </div>
          {complaint.event_date && (
            <div>
              <dt>Jogo relacionado</dt>
              <dd>
                {complaint.event_id ? (
                  <Link href={`/admin/volei/${complaint.event_id}`}>
                    {formatDate(complaint.event_date)}
                  </Link>
                ) : (
                  formatDate(complaint.event_date)
                )}
              </dd>
            </div>
          )}
        </dl>
        <h2>Relato</h2>
        <p className="vn-complaint-description">{complaint.description}</p>
      </section>
      <section className="volley-card vn-section">
        <ComplaintReview
          key={`${id}:${complaint.updated_at}`}
          id={id}
          status={complaint.status}
          note={complaint.admin_note}
          readAt={complaint.read_at}
        />
      </section>
      {history.length > 0 && (
        <section className="volley-card vn-section">
          <h2>Histórico de atendimento</h2>
          <ol className="vn-history">
            {history.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {complaintStatuses[entry.from_status as ComplaintStatus]} →{" "}
                  {complaintStatuses[entry.to_status as ComplaintStatus]}
                </strong>
                <small>{timestamp.format(new Date(entry.created_at))}</small>
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

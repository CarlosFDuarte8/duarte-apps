import { VolleyPageHeader, VolleyCard } from "@/components/volei/page-frame";
import { buildGateList } from "@/lib/volei/gate-list";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { getEvent, listMembers } from "@/lib/volei/repository";
import { formatDate } from "@/lib/volei/domain";
import { PrintGateList } from "@/components/volei/print-gate-list";
import { GateListTables } from "@/components/volei/gate-list-tables";
import { Button } from "@/components/ui/button";
import { publicWhatsAppGroup } from "@/lib/volei/group-settings";
import { WhatsAppGroupPrint } from "@/components/volei/whatsapp-group";
import "@/components/volei/gate-list.css";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [found, members, group] = await Promise.all([
    getEvent(client, id),
    listMembers(client),
    publicWhatsAppGroup(),
  ]);
  if (!found) notFound();
  const rows = buildGateList(members, found.attendance, found.guests);
  return (
    <div className="gate-page">
      <div className="gate-actions"><VolleyPageHeader eyebrow="CONTROLE DE ACESSO" title="Lista da portaria" description="Somente confirmados aprovados e convidados confirmados. Reservas e lista de espera não autorizam entrada." actions={<> <Button asChild variant="outline">
          <Link href={`/admin/volei/${id}`}>← Voltar ao jogo</Link>
        </Button>
<PrintGateList /> </>} /></div>
      <VolleyCard as="section" className="gate-sheet" data-variant="print">
        <header>
          <div className="gate-title">
          <span>CONTROLE DE ACESSO · PORTARIA</span>
          <h1>{found.event.title}</h1>
          <h2>{formatDate(found.event.date)}</h2>
          <p>
            {[found.event.start_time, found.event.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <strong>Entrada autorizada somente para os nomes abaixo</strong>
          </div>
          <WhatsAppGroupPrint group={group} />
        </header>
        <GateListTables rows={rows} />
        {!rows.length && <p>Nenhum participante confirmado para este dia.</p>}
        <footer>
          <strong>Total autorizado: {rows.length} pessoas</strong>
          <p>
            Conferir o nome completo antes de autorizar a entrada. Pessoas na
            espera ou com reserva não confirmada não constam nesta relação.
          </p>
          <p>
            Responsável pela conferência: ____________________________________
          </p>
          <small>
            Emitida em{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date())}
            . Consulte a organização em caso de atualização da lista.
          </small>
        </footer>
      </VolleyCard>
    </div>
  );
}

import Link from "next/link";
import { Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { requireVoleiAdmin as requireAdmin } from "@/lib/volei/auth";
import { PageHeader } from "@/components/escalas/admin-ui";
import { EventManager } from "@/components/volei/event-manager";
import { getEvent, listMembers, publicEvent } from "@/lib/volei/repository";
import { GameRoster } from "@/components/volei/game-roster";
import { formatDate } from "@/lib/volei/domain";
import { Button } from "@/components/ui/button";
import { AdminGuestForm } from "@/components/volei/admin-guest-form";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { client } = await requireAdmin();
  const game = await publicEvent(id);
  const [found, members] = await Promise.all([
    getEvent(client, id),
    listMembers(client),
  ]);
  if (!found) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Vôlei"
        title={formatDate(found.event.date)}
        actions={
          <>
            <Button asChild>
              <Link href={`/admin/volei/${id}/portaria`}>
                <Printer aria-hidden="true" /> Imprimir lista da portaria
              </Link>
            </Button>
            <Link
              className="sc-button sc-btn-ghost"
              href={`/admin/volei?mes=${found.event.date.slice(0, 7)}`}
            >
              ← Voltar
            </Link>
          </>
        }
      />
      <Button asChild variant="outline">
        <Link href={`/admin/volei/${id}/quadra`}>
          Montar times e controlar a quadra
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={`/admin/volei/frequencia/${id}`}>
          Conferir quem compareceu
        </Link>
      </Button>
      <AdminGuestForm
        eventId={id}
        finalized={!!found.event.presence_closed_at}
        sponsors={members
          .filter(
            (member) =>
              member.is_active &&
              !member.blocked &&
              member.membership_status === "approved" &&
              found.attendance.some(
                (row) =>
                  row.member_id === member.id &&
                  ["confirmado", "espera"].includes(row.status),
              ),
          )
          .map(({ id, name }) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
      />
      <EventManager
        event={found.event}
        members={members}
        attendance={found.attendance}
        guests={found.guests}
      />
      {game && <GameRoster game={game} updatedAt={new Date().toISOString()} />}
    </>
  );
}

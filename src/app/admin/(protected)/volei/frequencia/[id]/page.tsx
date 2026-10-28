import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { getEvent, listMembers } from "@/lib/volei/repository";
import { formatDate, today } from "@/lib/volei/domain";
import {
  PresenceRollCall,
  type PresencePerson,
} from "@/components/volei/presence-roll-call";
import { Button } from "@/components/ui/button";
import "@/components/volei/management.css";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [found, members] = await Promise.all([
    getEvent(client, id),
    listMembers(client),
  ]);
  if (!found) notFound();
  const names = new Map(members.map((m) => [m.id, m.name]));
  const people: PresencePerson[] = [
    ...found.attendance.map((p) => ({
      id: p.member_id,
      name: names.get(p.member_id) ?? "Membro",
      guest: false,
      status: p.status,
      checkedIn: !!p.checked_in_at,
    })),
    ...found.guests.map((p) => ({
      id: p.member_id,
      name: p.name,
      guest: true,
      status: p.status,
      checkedIn: !!p.checked_in_at,
    })),
  ].sort(
    (a, b) =>
      Number(a.guest) - Number(b.guest) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
  return (
    <>
      <Button asChild variant="ghost">
        <Link href="/admin/volei/frequencia">← Voltar para frequência</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={`/admin/volei/${id}/quadra`}>
          Times e controle da quadra
        </Link>
      </Button>
      <section className="volley-hero">
        <span className="volley-eyebrow">CHAMADA DO ENCONTRO</span>
        <h1>{formatDate(found.event.date)}</h1>
        <p>
          {found.event.title} ·{" "}
          {[found.event.start_time, found.event.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>
      {found.event.date > today() ? (
        <section className="volley-card">
          A chamada fica disponível a partir do dia do jogo.
        </section>
      ) : (
        <PresenceRollCall
          eventId={id}
          closed={!!found.event.presence_closed_at}
          people={people}
        />
      )}
    </>
  );
}

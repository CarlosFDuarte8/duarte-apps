import Link from "next/link";
import { PersonAvatar } from "./person-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ageLabel } from "@/lib/volei/profile";
import { displayPhone } from "@/lib/volei/phone";
import { formatDate } from "@/lib/volei/domain";
import type { GuestProfileRow } from "@/lib/volei/repository";
import "./profile.css";
export function GuestDirectory({ guests }: { guests: GuestProfileRow[] }) {
  return (
    <div className="vp-guest-list">
      {guests.map((guest) => (
        <article key={guest.id} className="vp-guest-row">
          <PersonAvatar name={guest.name} photoUrl={guest.photo_url} />
          <div>
            <strong>{guest.name}</strong>
            {guest.blocked && <Badge variant="outline">Bloqueado</Badge>}
            <small>
              Convidado de{" "}
              <Link href={`/admin/volei/membros/${guest.member_id}`}>
                {guest.volei_members?.name ?? "Membro"}
              </Link>
              {guest.volei_events && (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/admin/volei/${guest.event_id}`}>
                    {formatDate(guest.volei_events.date)}
                  </Link>
                </>
              )}
            </small>
            <small>
              {guest.phone
                ? displayPhone(guest.phone)
                : "Telefone não informado"}{" "}
              · {ageLabel(guest.birth_date)}
            </small>
          </div>
          <Button asChild variant="outline">
            <Link href={`/admin/volei/convidados/${guest.id}`}>
              Ver cadastro
            </Link>
          </Button>
        </article>
      ))}
      {!guests.length && (
        <p className="vm-hint">Nenhum convidado registrado.</p>
      )}
    </div>
  );
}

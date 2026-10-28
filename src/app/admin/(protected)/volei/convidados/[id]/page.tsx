import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { getGuestProfile } from "@/lib/volei/repository";
import { today, formatDate } from "@/lib/volei/domain";
import { ageLabel } from "@/lib/volei/profile";
import { PageHeader } from "@/components/escalas/admin-ui";
import { ProfileForm } from "@/components/volei/profile-form";
import { GuestAdminControls } from "@/components/volei/guest-admin-controls";
import { SkillLevelForm } from "@/components/volei/skill-level-form";
import { saveAdminGuestProfile } from "@/app/admin/volei-profile-actions";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const guest = await getGuestProfile(client, id);
  if (!guest) notFound();
  return (
    <>
      <PageHeader
        eyebrow="Vôlei · Convidados"
        title={guest.name}
        description={ageLabel(guest.birth_date)}
        actions={
          <Link
            className="sc-button sc-btn-ghost"
            href="/admin/volei/convidados"
          >
            ← Voltar para convidados
          </Link>
        }
      />
      <section className="volley-card vp-profile-form">
        <p>
          Convidado de{" "}
          <Link href={`/admin/volei/membros/${guest.member_id}`}>
            {guest.volei_members?.name}
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
        </p>
        <ProfileForm
          emergency={guest}
          name={guest.name}
          birthDate={guest.birth_date}
          photoUrl={guest.photo_url}
          maxDate={today()}
          save={saveAdminGuestProfile.bind(null, id)}
        />
        <GuestAdminControls
          id={id}
          phone={guest.phone}
          blocked={guest.blocked}
          reason={guest.blocked_reason}
        />
        <SkillLevelForm id={id} guest level={guest.skill_level} />
      </section>
    </>
  );
}

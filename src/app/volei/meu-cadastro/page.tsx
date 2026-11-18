import { VolleyCard, VolleyPageHeader, VolleySectionHeader } from "@/components/volei/page-frame";
import Link from "next/link";
import { currentPlayer } from "@/lib/volei/player-session";
import { signPhotos } from "@/lib/volei/photos";
import { today } from "@/lib/volei/domain";
import { displayPhone } from "@/lib/volei/phone";
import { ProfileForm } from "@/components/volei/profile-form";
import { canSubmitComplaint } from "@/lib/volei/complaints";
import { Button } from "@/components/ui/button";
import { saveOwnProfile } from "../profile-actions";
import "@/components/volei/profile.css";
import { PhoneAccessForm } from "@/components/volei/phone-access-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Meu cadastro | Vôlei",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const player = await currentPlayer();
  if (!player)
    return (
      <div className="vp-page">
        <VolleyPageHeader eyebrow="SEU ESPAÇO NO GRUPO" title="Meu cadastro" description="Mantenha seus dados e sua identificação atualizados." />
        <PhoneAccessForm />
      </div>
    );
  const person = (await signPhotos([player]))[0];
  return (
    <div className="vp-page">
      <VolleyPageHeader eyebrow="SEU ESPAÇO NO GRUPO" title="Meu cadastro" description="Sua identificação, foto e contato de emergência." actions={<Button asChild variant="outline"><Link href="/volei">Voltar para os jogos</Link></Button>} />
      <VolleyCard as="section">
        <VolleySectionHeader title={person.name} description={displayPhone(person.phone)} />
        {canSubmitComplaint(player) && (
          <Button asChild variant="outline">
            <Link href="/volei/relatar">
              Relatar uma situação ao responsável
            </Link>
          </Button>
        )}
        <ProfileForm
          birthRequired
          emergency={person}
          name={person.name}
          birthDate={person.birth_date}
          photoUrl={person.photo_url}
          maxDate={today()}
          save={saveOwnProfile}
        />
      </VolleyCard>
    </div>
  );
}

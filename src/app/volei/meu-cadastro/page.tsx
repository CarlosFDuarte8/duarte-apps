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
        <section className="volley-card">
          <h1>Meu cadastro</h1>
          <p>
            Abra o link do jogo e informe seu telefone para acessar seu cadastro
            neste navegador.
          </p>
          <Link href="/volei">Ver jogos</Link>
        </section>
      </div>
    );
  const person = (await signPhotos([player]))[0];
  return (
    <div className="vp-page">
      <Link href="/volei">← Voltar para os jogos</Link>
      <section className="volley-card">
        <h1>{person.name}</h1>
        <p>{displayPhone(person.phone)}</p>
        {canSubmitComplaint(player) && (
          <Button asChild variant="outline">
            <Link href="/volei/relatar">
              Relatar uma situação ao responsável
            </Link>
          </Button>
        )}
        <ProfileForm
          emergency={person}
          name={person.name}
          birthDate={person.birth_date}
          photoUrl={person.photo_url}
          maxDate={today()}
          save={saveOwnProfile}
        />
      </section>
    </div>
  );
}

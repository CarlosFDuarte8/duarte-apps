import { notFound } from "next/navigation";
import { guestByProfileToken } from "@/lib/volei/repository";
import { today, formatDate } from "@/lib/volei/domain";
import { ProfileForm } from "@/components/volei/profile-form";
import { saveGuestProfile } from "../../profile-actions";
import "@/components/volei/profile.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cadastro de convidado | Vôlei",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const guest = await guestByProfileToken(token);
  if (!guest) notFound();
  return (
    <div className="vp-page">
      <section className="volley-card">
        <h1>Olá, {guest.name}</h1>
        <p>
          Convidado de <strong>{guest.volei_members?.name}</strong> para{" "}
          {formatDate(guest.volei_events!.date)}.
        </p>
        <p>
          {guest.status === "confirmado"
            ? "Sua participação está confirmada na lista do dia."
            : "Você está aguardando uma vaga. O cadastro não confirma sua participação; membros têm prioridade."}
        </p>
        <ProfileForm
          emergency={guest}
          name={guest.name}
          birthDate={guest.birth_date}
          photoUrl={guest.photo_url}
          maxDate={today()}
          save={saveGuestProfile.bind(null, token)}
        />
        <small>
          Este link é pessoal e vale para este jogo. Você participa como
          convidado, sem entrar no cadastro de membros.
        </small>
      </section>
    </div>
  );
}

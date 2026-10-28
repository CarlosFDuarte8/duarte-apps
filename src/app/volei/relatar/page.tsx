import Link from "next/link";
import { currentPlayer } from "@/lib/volei/player-session";
import { canSubmitComplaint } from "@/lib/volei/complaints";
import { complaintTargets } from "@/lib/volei/complaint-repository";
import { ComplaintForm } from "@/components/volei/complaint-form";
import "@/components/volei/profile.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Relatar ao responsável | Vôlei",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const player = await currentPlayer();
  if (!canSubmitComplaint(player))
    return (
      <div className="vp-page">
        <section className="volley-card">
          <h1>Fale com o responsável</h1>
          <p>
            {player
              ? "Este recurso não está disponível para este cadastro. Fale diretamente com o responsável pelo grupo."
              : "Abra o link do jogo e identifique seu telefone para verificar seu acesso."}
          </p>
          <Link href="/volei">Voltar para os jogos</Link>
        </section>
      </div>
    );
  return (
    <div className="vp-page">
      <Link href="/volei/meu-cadastro">← Meu cadastro</Link>
      <section className="volley-card">
        <h1>Relatar ao responsável</h1>
        <p>
          Registre uma situação envolvendo um membro ou convidado. Apenas o
          responsável poderá ler e atender seu relato.
        </p>
      </section>
      <ComplaintForm targets={await complaintTargets(player!.id)} />
    </div>
  );
}

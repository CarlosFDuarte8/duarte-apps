import { VolleyCard, VolleyPageHeader } from "@/components/volei/page-frame";
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
        <VolleyPageHeader eyebrow="CUIDADO COM O GRUPO" title="Fale com o responsável" />
        <VolleyCard as="section">
          <p>
            {player
              ? "Este recurso não está disponível para este cadastro. Fale diretamente com o responsável pelo grupo."
              : "Abra o link do jogo e identifique seu telefone para verificar seu acesso."}
          </p>
          <Link href="/volei">Voltar para os jogos</Link>
        </VolleyCard>
      </div>
    );
  return (
    <div className="vp-page">
      <VolleyPageHeader eyebrow="CUIDADO COM O GRUPO" title="Relatar ao responsável" description="Seu relato será lido apenas pelo responsável pelo grupo." />
      <Link href="/volei/meu-cadastro">← Meu cadastro</Link>
      <VolleyCard as="section">
        <p>
          Registre uma situação envolvendo um membro ou convidado. Apenas o
          responsável poderá ler e atender seu relato.
        </p>
      </VolleyCard>
      <ComplaintForm targets={await complaintTargets(player!.id)} />
    </div>
  );
}

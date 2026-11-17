import { VolleyCard, VolleyPageHeader } from "@/components/volei/page-frame";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { listGuestProfiles } from "@/lib/volei/repository";

import { GuestDirectory } from "@/components/volei/guest-directory";
export default async function Page() {
  const { client } = await requireVoleiAdmin();
  const guests = await listGuestProfiles(client);
  return (
    <>
      <VolleyPageHeader
        eyebrow="Vôlei"
        title="Convidados"
        description="Últimas 200 inscrições de convidados, vinculadas ao membro responsável. Convidados não fazem parte do cadastro de membros."
      />
      <VolleyCard as="section">
        <GuestDirectory guests={guests} />
      </VolleyCard>
    </>
  );
}

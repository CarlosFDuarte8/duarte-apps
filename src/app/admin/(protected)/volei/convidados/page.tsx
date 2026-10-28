import { requireVoleiAdmin } from "@/lib/volei/auth";
import { listGuestProfiles } from "@/lib/volei/repository";
import { PageHeader } from "@/components/escalas/admin-ui";
import { GuestDirectory } from "@/components/volei/guest-directory";
export default async function Page() {
  const { client } = await requireVoleiAdmin();
  const guests = await listGuestProfiles(client);
  return (
    <>
      <PageHeader
        eyebrow="Vôlei"
        title="Convidados"
        description="Últimas 200 inscrições de convidados, vinculadas ao membro responsável. Convidados não fazem parte do cadastro de membros."
      />
      <section className="volley-card">
        <GuestDirectory guests={guests} />
      </section>
    </>
  );
}

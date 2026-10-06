import { snapshot } from "@/lib/escalas/repository";
import { MemberForm } from "@/components/escalas/forms";
import { PageHeader } from "@/components/escalas/admin-ui";
export default async function Page() {
  const state = await snapshot();
  return (
    <>
      <PageHeader
        eyebrow="Membros"
        title="Cadastrar membro"
        description="Informe os dados, a disponibilidade e as funções permitidas."
      />
      <MemberForm revision={state.revision} />
    </>
  );
}

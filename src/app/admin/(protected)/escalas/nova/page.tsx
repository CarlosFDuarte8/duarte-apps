import { snapshot } from "@/lib/escalas/repository";
import { GenerationForm } from "@/components/escalas/forms";
import { PageHeader } from "@/components/escalas/admin-ui";
export default async function Page() {
  const state = await snapshot();
  return (
    <>
      <PageHeader
        eyebrow="Escalas"
        title="Gerar escalas"
        description="Os meses gerados ficam como rascunho até você publicar."
      />
      <GenerationForm revision={state.revision} />
    </>
  );
}

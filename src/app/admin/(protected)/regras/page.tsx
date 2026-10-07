import { snapshot } from "@/lib/escalas/repository";
import { RulesForm } from "@/components/escalas/forms";
import { PageHeader } from "@/components/escalas/admin-ui";
export default async function Page() {
  const state = await snapshot();
  return (
    <>
      <PageHeader
        eyebrow="Configuração"
        title="Regras e dependências"
        description="Defina os dias de culto e como as participações são distribuídas."
      />
      <RulesForm
        key={state.revision}
        context={{
          members: state.members,
          dependencies: state.dependencies,
          rules: state.rules,
        }}
        revision={state.revision}
      />
    </>
  );
}

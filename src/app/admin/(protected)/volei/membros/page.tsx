import Link from "next/link";
import { requireVoleiAdmin as requireAdmin } from "@/lib/volei/auth";
import { PageHeader } from "@/components/escalas/admin-ui";
import { MemberManager } from "@/components/volei/member-manager";
import { ImportLegacyMembers } from "@/components/volei/import-legacy";
import { listMembers } from "@/lib/volei/repository";

export default async function Page() {
  const { client } = await requireAdmin();
  const members = await listMembers(client);
  return (
    <>
      <PageHeader
        eyebrow="Vôlei"
        title="Membros do grupo"
        description="Consulte os membros e acompanhe os cadastros do grupo. Abra um perfil para editar os dados e as preferências."
        actions={
          <Link className="sc-button sc-btn-ghost" href="/admin/volei">
            ← Dias de jogo
          </Link>
        }
      />
      <MemberManager members={members} />
      <details className="vm-legacy-import">
        <summary>Importar membros da lista antiga</summary>
        <ImportLegacyMembers />
      </details>
    </>
  );
}

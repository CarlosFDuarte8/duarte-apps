import { VolleyPageHeader } from "@/components/volei/page-frame";
import Link from "next/link";
import { requireVoleiAdmin as requireAdmin } from "@/lib/volei/auth";

import { MemberManager } from "@/components/volei/member-manager";
import { ImportLegacyMembers } from "@/components/volei/import-legacy";
import { listMembers } from "@/lib/volei/repository";

export default async function Page({ searchParams }: { searchParams: Promise<{ grupo?: string }> }) {
  const { grupo } = await searchParams;
  const { client } = await requireAdmin();
  const members = await listMembers(client);
  return (
    <>
      <VolleyPageHeader
        eyebrow="Vôlei"
        title="Membros do grupo"
        description="Consulte os membros e acompanhe os cadastros do grupo. Abra um perfil para editar os dados e as preferências."
        actions={
          <Link className="sc-button sc-btn-ghost" href="/admin/volei">
            ← Dias de jogo
          </Link>
        }
      />
      <MemberManager members={members} initialGroup={grupo === "pending" ? "pending" : "todos"} />
      <details className="vm-legacy-import">
        <summary>Importar membros da lista antiga</summary>
        <ImportLegacyMembers />
      </details>
    </>
  );
}

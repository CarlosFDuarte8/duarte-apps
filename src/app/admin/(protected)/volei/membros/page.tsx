import Link from "next/link";
import { requireVoleiAdmin as requireAdmin } from "@/lib/volei/auth";
import { PageHeader } from "@/components/escalas/admin-ui";
import { MemberManager } from "@/components/volei/member-manager";
import { ImportLegacyMembers } from "@/components/volei/import-legacy";
import { listMembers, listPointLogs } from "@/lib/volei/repository";

export default async function Page() {
  const { client } = await requireAdmin();
  const [members, logs] = await Promise.all([
    listMembers(client),
    listPointLogs(client),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Vôlei"
        title="Membros do grupo"
        description="Organize o grupo principal, os contatos e os dias preferidos de cada pessoa. Estas configurações são privadas."
        actions={
          <Link className="sc-button sc-btn-ghost" href="/admin/volei">
            ← Dias de jogo
          </Link>
        }
      />
      <ImportLegacyMembers />
      <MemberManager members={members} logs={Object.fromEntries(logs)} />
    </>
  );
}

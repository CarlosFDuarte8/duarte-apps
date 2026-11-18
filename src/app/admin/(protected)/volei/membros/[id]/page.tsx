import { VolleyCard, VolleyPageHeader } from "@/components/volei/page-frame";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import {
  getMember,
  memberPointLogs,
  listGuestProfiles,
} from "@/lib/volei/repository";
import { GuestDirectory } from "@/components/volei/guest-directory";

import { Button } from "@/components/ui/button";
import { MemberEditor } from "@/components/volei/member-editor";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireVoleiAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const member = await getMember(client, id);
  if (!member) notFound();
  const log = await memberPointLogs(client, id);
  const guests = await listGuestProfiles(client, id);

  return (
    <>
      <VolleyPageHeader
        eyebrow="Vôlei · Membros"
        title="Editar membro"
        description="Gerencie o contato, a aprovação e as preferências deste membro. As configurações são privadas."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/volei/membros">← Voltar para membros</Link>
          </Button>
        }
      />
      <MemberEditor key={member.id} member={member} log={log} />
      <VolleyCard as="section">
        <h2 className="vm-editor-heading">Convidados deste membro</h2>
        <GuestDirectory guests={guests} />
      </VolleyCard>
    </>
  );
}

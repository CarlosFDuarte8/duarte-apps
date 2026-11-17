import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VolleyPageHeader } from "@/components/volei/page-frame";
import { WhatsAppGroupForm } from "@/components/volei/whatsapp-group-form";
import { WhatsAppGroupCard } from "@/components/volei/whatsapp-group";
import { requireVoleiAdmin } from "@/lib/volei/auth";
import { groupInviteInfo, readGroupSettings } from "@/lib/volei/group-settings";
import styles from "@/components/volei/whatsapp-group.module.css";

export default async function Page() {
  const { client } = await requireVoleiAdmin();
  const settings = await readGroupSettings(client);
  const group = await groupInviteInfo(settings.url);
  return <>
    <VolleyPageHeader eyebrow="CONFIGURAÇÕES DO GRUPO" title="Grupo do WhatsApp" description="Facilite o acesso aos avisos e mantenha a aprovação dos pedidos no WhatsApp." actions={<Button asChild variant="outline"><Link href="/admin/volei">Voltar ao painel</Link></Button>} />
    <div className={styles.settings}>
      <WhatsAppGroupForm initialUrl={settings.url} ready={settings.ready} />
      {group && <section aria-label="Prévia do convite público"><WhatsAppGroupCard group={group} /></section>}
    </div>
  </>;
}

/* eslint-disable @next/next/no-img-element -- QR codes are generated PNG data URLs, rendered and printed without image optimization. */
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WhatsAppGroupInfo } from "@/lib/volei/whatsapp";
import { VolleyCard, VolleySectionHeader } from "./page-frame";
import styles from "./whatsapp-group.module.css";

export function WhatsAppGroupCard({ group }: { group: WhatsAppGroupInfo | null }) {
  if (!group) return null;
  return <VolleyCard as="section" data-slot="whatsapp-group-card">
    <VolleySectionHeader icon={<MessageCircle />} title="Vôlei no WhatsApp" description="Ainda não está no grupo? Solicite sua entrada para acompanhar os avisos dos jogos." />
    <div className={styles.invitation}>
      <div className={styles.copy}>
        <Button asChild><a href={group.url} target="_blank" rel="noopener noreferrer">Solicitar entrada</a></Button>
        <p>Ou escaneie o QR code com a câmera do celular.</p>
      </div>
      <a href={group.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir convite do grupo do WhatsApp">
        <img className={styles.qr} src={group.qrCode} alt="QR code para solicitar entrada no grupo do WhatsApp" width={112} height={112} />
      </a>
    </div>
    <p className={styles.note}>A solicitação é feita no WhatsApp. A confirmação de presença no jogo continua por aqui.</p>
  </VolleyCard>;
}

export function WhatsAppGroupPrint({ group }: { group: WhatsAppGroupInfo | null }) {
  if (!group) return null;
  return <figure data-slot="whatsapp-group-print" className={styles.print}>
    <a href={group.url}>
      <img className={styles.qr} src={group.qrCode} alt="QR code do grupo do WhatsApp" width={100} height={100} />
    </a>
    <figcaption><strong>Grupo do WhatsApp</strong><span>Escaneie para solicitar entrada.</span></figcaption>
  </figure>;
}

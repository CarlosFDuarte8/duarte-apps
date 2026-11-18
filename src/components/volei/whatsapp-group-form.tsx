"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveWhatsAppGroup } from "@/app/admin/volei-settings-actions";
import { VolleyFormCard, VolleySectionHeader } from "./page-frame";
import { useRun } from "./use-run";
import styles from "./whatsapp-group.module.css";

export function WhatsAppGroupForm({ initialUrl, ready }: { initialUrl: string | null; ready: boolean }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [saved, setSaved] = useState(false);
  const { run, pending, feedback } = useRun({ revalidated: true });
  return <VolleyFormCard onSubmit={event => {
    event.preventDefault();
    setSaved(false);
    run(() => saveWhatsAppGroup(url), () => setSaved(true));
  }}>
    <VolleySectionHeader title="Convite para o grupo" description="O mesmo link será usado no botão público e nos QR codes da área pública e das listas impressas." />
    <div className={styles.field}>
      <label htmlFor="whatsapp-group-url">Link de convite do WhatsApp</label>
      <Input id="whatsapp-group-url" name="whatsapp_invite_url" type="url" value={url} onChange={event => { setUrl(event.target.value); setSaved(false); }} placeholder="https://chat.whatsapp.com/…" maxLength={500} disabled={!ready || pending} aria-describedby="whatsapp-group-help" />
      <small id="whatsapp-group-help" className={styles.help}>No WhatsApp, abra os dados do grupo e copie o link em “Convidar via link”. Deixe o campo vazio e salve para ocultar o convite em todo o site e nas próximas impressões.</small>
    </div>
    <p className={styles.help}>Ative a aprovação de novos participantes nas permissões do grupo do WhatsApp para analisar os pedidos antes de liberar a entrada.</p>
    {!ready && <p role="alert">Aplique a atualização do banco de configurações do grupo para habilitar este recurso.</p>}
    {feedback}
    <div className={styles.actions}>
      <Button type="submit" loading={pending} disabled={!ready}>Salvar link do grupo</Button>
      {saved && !pending && <p role="status" className={styles.feedback}>{url.trim() ? "Link do grupo salvo." : "Convite ocultado da área pública e das próximas impressões."}</p>}
    </div>
  </VolleyFormCard>;
}

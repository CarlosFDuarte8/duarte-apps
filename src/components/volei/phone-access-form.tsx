"use client";

import Link from "next/link";
import { useState } from "react";
import { identifyByPhone } from "@/app/volei/access-actions";
import { Button } from "@/components/ui/button";
import { VolleyFormCard, VolleySectionHeader } from "./page-frame";
import { PhoneField } from "./phone-input";
import { useRun } from "./use-run";

export function PhoneAccessForm() {
  const [phone, setPhone] = useState("");
  const [notFound, setNotFound] = useState(false);
  const { run, pending, feedback } = useRun({ revalidated: true, successMessage: "" });
  return <VolleyFormCard onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    setNotFound(false);
    run(async () => {
      const result = await identifyByPhone(phone);
      setNotFound(!result.error && !result.found);
      return result;
    }, undefined, "Consultando seu cadastro…");
  }}>
    <VolleySectionHeader title="Acesse com seu celular" description="Use o número do seu cadastro e o navegador que você já utiliza no grupo." />
    <PhoneField label="Celular com DDD" value={phone} onChange={setPhone} required disabled={pending} />
    {feedback}
    {notFound && <div role="status"><p>Não encontramos um cadastro para esse número. Confira o celular ou escolha um jogo para solicitar seu cadastro.</p><Button asChild variant="outline"><Link href="/volei">Ver jogos e solicitar cadastro</Link></Button></div>}
    <Button type="submit" loading={pending} loadingText="Consultando…">Acessar meu cadastro</Button>
    <p>Se estiver em outro aparelho, peça a liberação ao responsável. <Link href="/volei/privacidade" className="underline underline-offset-2">Política de Privacidade</Link>.</p>
  </VolleyFormCard>;
}

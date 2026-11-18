"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { VolleyCard, VolleySectionHeader } from "./page-frame";

export function VolleyRouteError({ retry }: { retry: () => void }) {
  const [pending, start] = useTransition();
  return <VolleyCard as="section" role="alert">
    <VolleySectionHeader title="Não foi possível atualizar esta tela" description="Confira sua conexão e tente novamente. Uma falha de carregamento não confirma nem cancela sua participação." />
    <Button type="button" loading={pending} loadingText="Consultando…" onClick={() => start(() => retry())}>Tentar novamente</Button>
  </VolleyCard>;
}

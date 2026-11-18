"use client";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { VolleyCard } from "@/components/volei/page-frame";

import { useState } from "react";
import { addAdminGuest } from "@/app/admin/volei-actions";
import { useRun } from "./use-run";

export function AdminGuestForm({
  eventId,
  sponsors,
  finalized,
  embedded = false,
}: {
  eventId: string;
  sponsors: { id: string; name: string }[];
  finalized: boolean;
  embedded?: boolean;
}) {
  const { run, pending, feedback } = useRun({ revalidated: true });
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [receipt, setReceipt] = useState("");
  const unavailable = finalized || sponsors.length === 0;
  return (
    <VolleyCard as="section"
      data-variant={embedded ? "embedded" : undefined}
      id="adicionar-convidado"
      className="sc-form-card scroll-mt-24"
    >
      <h2>Adicionar convidado</h2>
      <p>
        Inclusão pelo administrador, mesmo após o prazo. Para cadastrar como seu
        convidado, escolha seu nome como responsável.
      </p>
      {finalized ? (
        <p>A presença deste jogo já foi concluída.</p>
      ) : sponsors.length === 0 ? (
        <p>É necessário ter um membro inscrito e aprovado como responsável.</p>
      ) : (
        <p>
          Com vaga livre, o convidado será confirmado. Sem vaga, entrará na
          espera.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || unavailable) return;
          setReceipt("");
          run(
            async () => {
              const result = await addAdminGuest(eventId, memberId, name);
              if (!result.error) {
                setReceipt(
                  `${result.name}: ${result.status === "confirmado" ? "confirmado — já consta na lista do jogo" : "na lista de espera — aguarde a liberação de vaga"}.`,
                );
                setName("");
              }
              return result;
            },
            undefined,
            "Adicionando convidado…",
          );
        }}
      >
        <label>
          Responsável pelo convidado
          <NativeSelect
            required
            value={memberId}
            disabled={pending || unavailable}
            onChange={(event) => setMemberId(event.target.value)}
          >
            <option value="">Selecione seu nome ou o responsável</option>
            {sponsors.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label>
          Nome completo do convidado
          <Input
            required
            maxLength={100}
            value={name}
            disabled={pending || unavailable}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome de quem vai jogar"
            autoComplete="off"
          />
        </label>
        {feedback}
        {receipt && <p role="status">{receipt}</p>}
        <Button
          type="submit"
          className="sc-btn"
          disabled={pending || unavailable || !memberId || !name.trim()}
        >
          {pending ? "Adicionando…" : "Adicionar convidado ao jogo"}
        </Button>
      </form>
    </VolleyCard>
  );
}

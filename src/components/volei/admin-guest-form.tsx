"use client";
import { useRef, useState } from "react";
import { addAdminGuest } from "@/app/admin/volei-actions";
import { useRun } from "./use-run";

export function AdminGuestForm({
  eventId,
  sponsors,
  finalized,
}: {
  eventId: string;
  sponsors: { id: string; name: string }[];
  finalized: boolean;
}) {
  const { run, pending, feedback } = useRun({ revalidated: true });
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [receipt, setReceipt] = useState("");
  const lock = useRef(false);
  const unavailable = finalized || sponsors.length === 0;
  return (
    <section
      id="adicionar-convidado"
      className="sc-card sc-form-card scroll-mt-24"
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
          if (lock.current || pending || unavailable) return;
          lock.current = true;
          setReceipt("");
          run(
            async () => {
              try {
                const result = await addAdminGuest(eventId, memberId, name);
                if (!result.error) {
                  setReceipt(
                    `${result.name}: ${result.status === "confirmado" ? "confirmado — já consta na lista do jogo" : "na lista de espera — aguarde a liberação de vaga"}.`,
                  );
                  setName("");
                }
                return result;
              } finally {
                lock.current = false;
              }
            },
            undefined,
            "Adicionando convidado…",
          );
        }}
      >
        <label>
          Responsável pelo convidado
          <select
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
          </select>
        </label>
        <label>
          Nome completo do convidado
          <input
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
        <button
          type="submit"
          className="sc-btn"
          disabled={pending || unavailable || !memberId || !name.trim()}
        >
          {pending ? "Adicionando…" : "Adicionar convidado ao jogo"}
        </button>
      </form>
    </section>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { submitComplaint } from "@/app/volei/complaint-actions";
import { formatDate } from "@/lib/volei/domain";
import type { complaintTargets } from "@/lib/volei/complaint-repository";
import "./notifications.css";
import { useOperationStatus } from "./activity";
export function ComplaintForm({
  targets,
}: {
  targets: Awaited<ReturnType<typeof complaintTargets>>;
}) {
  const [type, setType] = useState("member");
  const [target, setTarget] = useState("");
  const [event, setEvent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  useOperationStatus(
    pending,
    "Enviando relato…",
    error,
    sent ? "Relato enviado." : "",
  );
  const key = useRef("");
  if (sent)
    return (
      <section className="volley-card vn-sent" role="status">
        <h2>Relato enviado</h2>
        <p>
          O responsável recebeu sua solicitação para análise. Seu relato não
          aparece para o grupo nem para a pessoa mencionada.
        </p>
        <Button
          type="button"
          onClick={() => {
            setSent(false);
            setTitle("");
            setDescription("");
            setTarget("");
            setEvent("");
            key.current = "";
          }}
        >
          Enviar outro relato
        </Button>
      </section>
    );
  return (
    <form
      className="volley-card vn-complaint-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (!key.current) key.current = crypto.randomUUID();
        start(async () => {
          try {
            const result = await submitComplaint({
              targetType: type,
              targetId: target,
              eventId: type === "member" && event ? event : null,
              title,
              description,
              submissionKey: key.current,
            });
            if (result.error) setError(result.error);
            else setSent(true);
          } catch {
            setError("Não foi possível enviar. Tente novamente.");
          }
        });
      }}
    >
      <p className="vn-private-note">
        Canal privado com o responsável. O relato registra quem enviou e será
        avaliado antes de qualquer decisão.
      </p>
      <label>
        O relato é sobre
        <NativeSelect
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setTarget("");
          }}
        >
          <option value="member">Um membro</option>
          <option value="guest">Um convidado</option>
        </NativeSelect>
      </label>
      <label>
        {type === "member" ? "Membro" : "Convidado e jogo"}
        <NativeSelect
          required
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Selecione uma pessoa</option>
          {type === "member"
            ? targets.members.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))
            : targets.guests.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} · convidado de {person.volei_members?.name} ·{" "}
                  {formatDate(person.volei_events.date)}
                </option>
              ))}
        </NativeSelect>
      </label>
      {type === "member" && (
        <label>
          Jogo relacionado (opcional)
          <NativeSelect
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          >
            <option value="">Sem jogo específico</option>
            {targets.events.map((game) => (
              <option key={game.id} value={game.id}>
                {formatDate(game.date)} · {game.title}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      <label>
        Assunto
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          maxLength={120}
          placeholder="Resuma o ocorrido"
        />
      </label>
      <label>
        O que aconteceu?
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={20}
          maxLength={3000}
          rows={6}
          placeholder="Descreva o ocorrido com clareza, incluindo o contexto e a data, se souber."
        />
        <small>{description.length}/3000 caracteres</small>
      </label>
      {error && (
        <p className="volley-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={pending} loadingText="Enviando relato…">
        {pending ? "Enviando…" : "Enviar ao responsável"}
      </Button>
    </form>
  );
}

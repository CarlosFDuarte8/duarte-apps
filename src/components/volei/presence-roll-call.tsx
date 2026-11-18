"use client";
import { VolleyCard } from "@/components/volei/page-frame";

import { useRun } from "./use-run";
import { recordPresence, closePresence } from "@/app/admin/volei-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { VolleyListFilters } from "./list-filters";
import { matchesName, matchesKind, participantKinds } from "@/lib/volei/list-search";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
export type PresencePerson = {
  id: string;
  name: string;
  guest: boolean;
  status: string;
  checkedIn: boolean;
};
export function PresenceRollCall({
  eventId,
  closed,
  people,
}: {
  eventId: string;
  closed: boolean;
  people: PresencePerson[];
}) {
  const { run, pending, feedback } = useRun();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [arrival, setArrival] = useState("all");
  const attendees = people.filter(
    (p) => p.status === "confirmado" || p.status === "ausente",
  );
  const present = attendees.filter((p) => p.checkedIn).length;
  const visible = attendees.filter(person => matchesName(person.name, search) && matchesKind(person.guest, kind) &&
    (arrival === "all" || (arrival === "present" ? person.checkedIn : !person.checkedIn)));
  return (
    <VolleyCard as="section">
      <div className="vm-section-head">
        <div>
          <h2>Quem compareceu?</h2>
          <p className="vm-hint">
            Marque apenas quem esteve no jogo.{" "}
            {closed
              ? "As correções atualizam o ranking automaticamente."
              : "Depois, conclua a chamada para atualizar o ranking."}
          </p>
        </div>
        <Badge>
          {present} de {attendees.length} presentes
        </Badge>
      </div>
      {feedback}
      <VolleyListFilters search={search} onSearch={setSearch} filters={[
        { label: "Tipo de participante", value: kind, onChange: setKind, options: participantKinds },
        { label: "Chegada", value: arrival, onChange: setArrival, options: [{ value: "all", label: "Todas as chegadas" }, { value: "pending", label: closed ? "Ausentes" : "Ainda não chegaram" }, { value: "present", label: "Presentes" }] },
      ]} shown={visible.length} total={attendees.length} active={!!search || kind !== "all" || arrival !== "all"} onClear={() => { setSearch(""); setKind("all"); setArrival("all"); }} />
      <div className="vm-roll-call">
        {visible.map((p) => (
          <label key={`${p.guest ? "guest" : "member"}-${p.id}`}>
            <Checkbox
              aria-label={`Compareceu: ${p.name}`}
              checked={p.checkedIn}
              disabled={pending}
              onCheckedChange={(checked) =>
                run(() =>
                  recordPresence({
                    eventId,
                    memberId: p.id,
                    present: checked === true,
                    guest: p.guest,
                  }),
                )
              }
            />
            <span>
              <strong>{p.name}</strong>
              <small>{p.guest ? "Convidado" : "Membro"}</small>
            </span>
            <Badge variant={p.checkedIn ? "default" : "outline"}>
              {p.checkedIn ? "Presente" : closed ? "Ausente" : "Não conferido"}
            </Badge>
          </label>
        ))}
      </div>
      {!!attendees.length && !visible.length && <p>Nenhum participante corresponde aos filtros. A chamada completa continua preservada.</p>}
      {!attendees.length && (
        <p className="vm-hint">Não há confirmados para conferir neste jogo.</p>
      )}
      {!closed && attendees.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button id="concluir-chamada" disabled={pending}>Concluir chamada</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Concluir a chamada deste jogo?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {present} pessoas marcadas como presentes. As{" "}
                {attendees.length - present} restantes serão registradas como
                ausentes, sem punição automática. As inscrições serão fechadas.
                Você poderá corrigir a chamada depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar chamada</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending}
                onClick={() => run(() => closePresence(eventId))}
              >
                Confirmar e atualizar frequência
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {closed && (
        <p className="vm-success">
          Chamada concluída. As presenças deste jogo já contam no ranking.
        </p>
      )}
    </VolleyCard>
  );
}

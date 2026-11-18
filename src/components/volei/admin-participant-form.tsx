"use client";

import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { registerAdminParticipant, setAttendance } from "@/app/admin/volei-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { displayPhone } from "@/lib/volei/phone";
import { VolleyCard, VolleySectionHeader } from "./page-frame";
import { AdminGuestForm } from "./admin-guest-form";
import { BirthDateField } from "./birth-date-field";
import { PhoneField } from "./phone-input";
import { useRun } from "./use-run";

type Person = { id: string; name: string; phone?: string | null };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function AdminParticipantForm({ eventId, members, sponsors, finalized }: {
  eventId: string; members: Person[]; sponsors: Person[]; finalized: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("member");
  const [search, setSearch] = useState("");
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [receipt, setReceipt] = useState("");
  const { run, pending, feedback } = useRun({ revalidated: true });
  const filtered = useMemo(() => {
    const query = search.trim();
    const digits = query.replace(/\D/g, "");
    return members.filter(person => normalize(person.name).includes(normalize(query)) ||
      /^[+\d\s().-]+$/.test(query) && !!digits && (person.phone ?? "").replace(/\D/g, "").includes(digits));
  }, [members, search]);
  return <VolleyCard as="section" id="adicionar-participante">
    <VolleySectionHeader title="Participantes do encontro" description="Inclua um membro, cadastre uma pessoa ou adicione um convidado sem sair do jogo." actions={<Button type="button" disabled={finalized} aria-expanded={open} aria-controls="participant-panel" onClick={() => setOpen(value => !value)}><UserPlus aria-hidden="true" />Adicionar participante</Button>} />
    {finalized && <p>A chamada foi concluída. Novas inclusões estão encerradas.</p>}
    {open && <div id="participant-panel" className="volley-participant-panel">
      <label>Como deseja adicionar?<NativeSelect value={mode} disabled={pending} onChange={event => { setMode(event.target.value); setReceipt(""); }}>
        <option value="member">Membro já cadastrado</option><option value="new">Novo cadastro de membro</option><option value="guest">Convidado de um membro</option>
      </NativeSelect></label>
      {mode === "guest" ? <AdminGuestForm eventId={eventId} sponsors={sponsors} finalized={finalized} embedded /> : <form className="volley-participant-panel" onSubmit={event => {
        event.preventDefault();
        if (pending || finalized) return;
        setReceipt("");
        run(async () => {
          if (mode === "member") {
            const result = await setAttendance(eventId, memberId, "confirmado");
            if (!result.error) setReceipt(`${members.find(person => person.id === memberId)?.name}: participação registrada. A confirmação segue as vagas e a ordem da fila.`);
            return result;
          }
          const result = await registerAdminParticipant({ eventId, name, phone, birthDate });
          if (!result.error) {
            setReceipt(`${result.name ?? name}: ${result.status === "confirmado" ? "confirmado no jogo" : "incluído na lista de espera"}.`);
            setName(""); setPhone(""); setBirthDate("");
          }
          return result;
        }, undefined, "Incluindo participante…");
      }}>
        {mode === "member" ? <>
          <label>Buscar membro por nome ou telefone<Input type="search" value={search} disabled={pending} onChange={event => { setSearch(event.target.value); setMemberId(""); }} /></label>
          <label>Membro para incluir<NativeSelect required value={memberId} disabled={pending} onChange={event => setMemberId(event.target.value)}><option value="">Selecione um membro</option>{filtered.map(person => <option key={person.id} value={person.id}>{person.name}{person.phone ? ` · ${displayPhone(person.phone)}` : ""}</option>)}</NativeSelect></label>
          {!filtered.length && <p>Nenhum membro encontrado. Confira a busca ou escolha Novo cadastro de membro.</p>}
        </> : <>
          <label>Nome completo do novo membro<Input required minLength={2} maxLength={100} value={name} disabled={pending} onChange={event => setName(event.target.value)} autoComplete="name" /></label>
          <PhoneField label="Celular com DDD" required value={phone} disabled={pending} onChange={setPhone} />
          <BirthDateField value={birthDate} onChange={setBirthDate} disabled={pending} />
          <p>O cadastro será aprovado pelo administrador e inscrito neste encontro. Se a pessoa já está cadastrada, use a busca para evitar duplicidade.</p>
        </>}
        {feedback}
        <Button type="submit" loading={pending} loadingText="Incluindo…" disabled={mode === "member" && !memberId}>{mode === "member" ? "Incluir membro no jogo" : "Cadastrar e incluir no jogo"}</Button>
      </form>}
      {receipt && <p role="status">{receipt}</p>}
    </div>}
  </VolleyCard>;
}

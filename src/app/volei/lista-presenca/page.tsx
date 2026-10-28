"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import styles from "./presenca.module.css";
import { initialVoleiMembers } from "@/lib/volei/initial-members";
import { today } from "@/lib/volei/domain";
import { CAPACITY, changeStatus, labels, ordered, rebalance, type Meeting, type Participant, type Status } from "@/lib/volei/local-attendance";

const KEY = "lista-presenca-v2";
const participantSchema = z.object({ id: z.string(), nome: z.string(), status: z.enum(["pendente", "confirmado", "espera", "cancelado", "ausente"]), responsible: z.string().optional(), registeredAt: z.string().optional(), order: z.number().optional(), checkedInAt: z.string().optional() });
const storeSchema = z.record(z.string(), z.object({ title: z.string(), deadline: z.string(), guestsAfter: z.string(), participants: z.array(participantSchema), history: z.array(z.object({ at: z.string(), text: z.string() })) }));
const blank = (): Meeting => ({ title: "Vôlei", deadline: "", guestsAfter: "", participants: initialVoleiMembers.map((nome, i) => ({ id: String(i + 1), nome, status: "pendente" })), history: [] });
function localTime() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date()).replace(" ", "T");
}
function timestamp(value?: string) { return value ? value.replace("T", " ").slice(0, 19) : "—"; }

export default function PresencaPage() {
  const [events, setEvents] = useState<Record<string, Meeting>>({});
  const [date, setDate] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [responsible, setResponsible] = useState("");
  const [filter, setFilter] = useState<Status | "todos">("todos");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
    const current = today();
    setDate(current);
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setEvents(storeSchema.parse(JSON.parse(stored)));
      else {
        const legacy = localStorage.getItem("lista-presenca-v1");
        const meeting = blank();
        if (legacy) {
          const old = z.object({ titulo: z.string().optional(), participantes: z.array(z.object({ id: z.string(), nome: z.string(), status: z.enum(["pendente", "confirmado", "nao_vai"]) })) }).parse(JSON.parse(legacy));
          meeting.title = old.titulo || "Vôlei";
          meeting.participants = old.participantes.map((p, i) => ({ ...p, status: p.status === "nao_vai" ? "cancelado" : p.status === "confirmado" ? "espera" : "pendente", order: p.status === "confirmado" ? i + 1 : undefined }));
          meeting.history.push({ at: localTime(), text: "Lista anterior importada. Ordem original preservada; horários antigos indisponíveis." });
        }
        setEvents({ [current]: rebalance(meeting, localTime()) });
      }
    } catch { setMessage("Não foi possível carregar os dados salvos. O conteúdo original foi preservado; recarregue a página após verificar o armazenamento."); return; }
    setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(events)); }
    catch { queueMicrotask(() => setMessage("Não foi possível salvar neste navegador. Exporte a lista antes de sair.")); }
  }, [events, loaded]);
  useEffect(() => {
    if (!loaded || !date) return;
    const refresh = () => setEvents(all => {
      const current = all[date];
      if (!current) return all;
      const next = rebalance(current, localTime());
      return next.history.length === current.history.length ? all : { ...all, [date]: next };
    });
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, [date, loaded]);
  const meeting = events[date] ?? blank();
  const confirmed = ordered(meeting.participants.filter(p => p.status === "confirmado"));
  const waiting = ordered(meeting.participants.filter(p => p.status === "espera"));
  function update(fn: (m: Meeting) => Meeting) {
    if (!loaded || !date) return;
    try {
      const next = fn(meeting);
      setEvents(all => ({ ...all, [date]: next }));
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao atualizar a lista."); }
  }
  function status(id: string, value: Status) { update(m => changeStatus(m, id, value, localTime())); }
  function add(e: React.FormEvent) {
    e.preventDefault();
    const nome = name.trim();
    if (!nome) return;
    update(m => {
      if (m.participants.some(p => p.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) throw new Error("Esse nome já está cadastrado.");
      if (responsible && !m.participants.some(p => p.id === responsible && !p.responsible)) throw new Error("Selecione um membro responsável.");
      if (responsible && m.participants.some(p => p.responsible === responsible && p.status !== "cancelado" && p.status !== "ausente")) throw new Error("Cada membro pode ter somente um convidado ativo por evento.");
      const p: Participant = { id: crypto.randomUUID(), nome, status: "pendente", responsible: responsible || undefined };
      const next = { ...m, participants: [...m.participants, p] };
      return responsible ? changeStatus(next, p.id, "confirmado", localTime()) : next;
    });
    setName("");
  }
  const text = [`*${meeting.title}*`, `Data: ${date.split("-").reverse().join("/")}`, "Confirmados — 3 times de 6", ...confirmed.map((p, i) => `${i + 1}. ${p.nome}${p.responsible ? " (convidado)" : ""}`), `Total: ${confirmed.length}/${CAPACITY}`, "", "Lista de espera", ...waiting.map((p, i) => `${i + 1}. ${p.nome}${p.responsible ? " (aguarda liberação de convidados)" : ""}`)].join("\n");
  return <main className={styles.pagina}><div className={styles.container}>
    <header className={styles.cabecalho}><div><span className={styles.subtitulo}>VÔLEI • 18 VAGAS • 3 TIMES DE 6</span><h1>Lista de presença</h1><p>Inscrição por ordem de confirmação, com prioridade para membros.</p></div><div className={styles.acoesCabecalho}>
      <button className={styles.botaoWhatsApp} onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage("Lista copiada."); } catch { setMessage("O navegador não permitiu copiar a lista."); } }}>Copiar p/ WhatsApp</button>
      <button className={styles.botaoWhatsApp} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")}>Enviar no WhatsApp</button>
      <button className={styles.botaoImprimir} onClick={() => window.print()}>Imprimir lista</button>
    </div></header>
    <p>Esta lista é manual e fica salva somente neste navegador. Selecione a data para consultar o histórico de cada encontro.</p>
    {message && <p role="status">{message}</p>}
    <fieldset disabled={!loaded} className={styles.controles}>
    <section className={styles.configuracoes}>
      <div className={styles.campo}><label htmlFor="title">Título</label><input id="title" value={meeting.title} onChange={e => update(m => ({ ...m, title: e.target.value }))}/></div>
      <div className={styles.campo}><label htmlFor="date">Data do encontro</label><input id="date" type="date" value={date} onChange={e => { if (e.target.value) setDate(e.target.value); }}/></div>
      <div className={styles.campo}><label htmlFor="deadline">Prazo de inscrição (Brasília)</label><input id="deadline" type="datetime-local" value={meeting.deadline} onChange={e => update(m => ({ ...m, deadline: e.target.value }))}/></div>
      <div className={styles.campo}><label htmlFor="guests">Liberar convidados a partir de (Brasília)</label><input id="guests" type="datetime-local" value={meeting.guestsAfter} onChange={e => update(m => rebalance({ ...m, guestsAfter: e.target.value }, localTime()))}/></div>
    </section>
    <p>Sem prazo, inscrições ficam abertas. Sem horário de liberação, convidados aguardam na fila separada. Após o prazo, não há novas inscrições nem promoções automáticas.</p>
    <section className={styles.resumo}>{(["todos", "confirmado", "espera", "cancelado", "ausente"] as const).map(s => <button key={s} className={`${styles.cartao} ${filter === s ? styles.cartaoAtivo : ""}`} onClick={() => setFilter(s)}><span>{s === "todos" ? "Cadastrados" : labels[s]}</span><strong>{s === "todos" ? meeting.participants.length : meeting.participants.filter(p => p.status === s).length}</strong></button>)}</section>
    <p><strong>{CAPACITY - confirmed.length} vagas disponíveis</strong> • {confirmed.filter(p => p.checkedInAt).length} presentes com check-in</p>
    <section className={styles.painel}><div className={styles.painelCabecalho}><h2>Participantes</h2></div>
      <form className={styles.formulario} onSubmit={add}><input aria-label="Nome" placeholder="Nome completo" required maxLength={100} value={name} onChange={e => setName(e.target.value)}/><select aria-label="Tipo e responsável" value={responsible} onChange={e => setResponsible(e.target.value)}><option value="">Cadastrar membro</option>{meeting.participants.filter(p => !p.responsible).map(p => <option key={p.id} value={p.id}>Convidado de {p.nome}</option>)}</select><button className={styles.botaoAdicionar}>Adicionar</button></form>
      <div className={styles.tabelaContainer}><table className={styles.tabela}><thead><tr><th>Posição</th><th>Participante</th><th>Inscrição</th><th>Situação</th><th>Presença</th></tr></thead><tbody>
        {ordered(meeting.participants).filter(p => filter === "todos" || p.status === filter).map(p => <tr key={p.id}><td>{p.status === "confirmado" ? confirmed.findIndex(r => r.id === p.id) + 1 : p.status === "espera" ? `${waiting.filter(r => !!r.responsible === !!p.responsible).findIndex(r => r.id === p.id) + 1} na fila ${p.responsible ? "de convidados" : "de membros"}` : "—"}</td><td className={styles.nome}>{p.nome}{p.responsible && <small> — convidado de {meeting.participants.find(r => r.id === p.responsible)?.nome}</small>}</td><td>{timestamp(p.registeredAt)}</td><td><span>{labels[p.status]}</span><div><button type="button" disabled={p.status === "confirmado" || p.status === "espera"} onClick={() => status(p.id, "confirmado")}>Inscrever</button> <button type="button" disabled={p.status === "cancelado"} onClick={() => status(p.id, "cancelado")}>Cancelar</button></div></td><td><label><input type="checkbox" disabled={p.status !== "confirmado"} checked={!!p.checkedInAt} onChange={e => update(m => ({ ...m, participants: m.participants.map(r => r.id === p.id ? { ...r, checkedInAt: e.target.checked ? localTime() : undefined } : r), history: [...m.history, { at: localTime(), text: `${p.nome}: check-in ${e.target.checked ? "registrado" : "removido"}.` }] }))}/> Check-in</label><button type="button" disabled={p.status !== "confirmado" || !!p.checkedInAt || date > today()} onClick={() => status(p.id, "ausente")}>Marcar falta</button></td></tr>)}
      </tbody></table></div></section>
    <section className={styles.painel}><h2>Histórico deste encontro</h2><p>Faltas são registradas sem punição automática. Cancelamentos e ausências liberam vagas enquanto as inscrições estão abertas.</p><ul>{[...meeting.history].reverse().map((h, i) => <li key={i}>{timestamp(h.at)} — {h.text}</li>)}</ul></section>
    </fieldset>
    <section className={styles.infoImpressao}><strong>Prévia da impressão</strong><span>Apenas confirmados • {confirmed.length}/18 nomes</span></section>
    <section className={styles.folha}><div className={styles.folhaCabecalho}><h2>{meeting.title}</h2><p>{date.split("-").reverse().join("/")}</p></div><table className={styles.tabelaImpressao}><thead><tr><th>Nº</th><th>Nome completo</th><th>Assinatura</th></tr></thead><tbody>{confirmed.map((p, i) => <tr key={p.id}><td>{i + 1}</td><td>{p.nome}</td><td></td></tr>)}</tbody></table></section>
  </div></main>;
}

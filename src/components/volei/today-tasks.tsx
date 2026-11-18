import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TodayTasksData } from "@/lib/volei/today-tasks";
import { formatDate } from "@/lib/volei/domain";
import { VolleyCard, VolleySectionHeader } from "./page-frame";

export function TodayTasks({ data }: { data: TodayTasksData }) {
  const game = data.event;
  const tasks = [
    { title: "Aprovar cadastros", detail: data.pending ? `${data.pending} ${data.pending === 1 ? "cadastro aguardando" : "cadastros aguardando"} aprovação` : "Nenhum cadastro pendente", href: "/admin/volei/membros?grupo=pending", done: data.pending === 0 },
    ...(game ? [
      { title: "Adicionar participantes", detail: game.finalized ? "Novas inscrições encerradas" : `${game.participants} participantes na chamada`, href: game.finalized ? undefined : `/admin/volei/${game.id}#adicionar-participante`, done: false },
      { title: "Imprimir lista da portaria", detail: "Abrir a versão para impressão", href: `/admin/volei/${game.id}/portaria`, done: false },
      { title: "Conferir chegadas", detail: `${game.present} de ${game.participants} presentes`, href: `/admin/volei/frequencia/${game.id}`, done: game.participants > 0 && game.present === game.participants },
      { title: game.finalized ? "Revisar chamada concluída" : "Concluir chamada", detail: game.finalized ? "Frequência atualizada; correções disponíveis" : "Registrar ausências e atualizar a frequência", href: `/admin/volei/frequencia/${game.id}${game.finalized ? "" : "#concluir-chamada"}`, done: game.finalized },
    ] : []),
  ];
  return <VolleyCard as="section" aria-label="Tarefas do jogo de hoje">
    <VolleySectionHeader title="Jogo de hoje" eyebrow="SEU PRÓXIMO PASSO" icon={<ClipboardList aria-hidden="true" />} description={game ? `${formatDate(game.date)} · ${game.title}` : "Não há encontro marcado para hoje. Você pode organizar os próximos dias na agenda abaixo."} />
    <ul className="volley-task-list">
      {tasks.map(task => <li key={task.title}>
        {task.href ? <Button asChild variant="outline" className="volley-task-link"><Link href={task.href}>
          <span><strong>{task.title}</strong><small>{task.detail}</small></span>
          {task.done ? <CheckCircle2 aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Link></Button> : <div className="volley-task-unavailable"><strong>{task.title}</strong><small>{task.detail}</small></div>}
      </li>)}
    </ul>
    {!game && <Button asChild variant="outline"><a href="#agendar-jogos">Agendar um encontro</a></Button>}
  </VolleyCard>;
}

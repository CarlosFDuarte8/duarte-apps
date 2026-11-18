import { queueRules } from "@/lib/volei/queue";

export function QueuePosition({ position, guest = false }: { position?: number | null; guest?: boolean }) {
  if (!position) return null;
  return <div data-slot="queue-position">
    <p><strong>{guest ? "Seu convidado é" : "Você é"} o {position}º na fila de {guest ? "convidados" : "membros"}.</strong></p>
    <p>{queueRules}</p>
  </div>;
}

"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronRight, UserPlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import type { NotificationSummary } from "@/lib/volei/complaints";
import "./notifications.css";
export function NotificationBell() {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    let active = true,
      inflight = false;
    const controller = new AbortController();
    async function refresh() {
      if (inflight || document.visibilityState === "hidden") return;
      inflight = true;
      try {
        const response = await fetch("/admin/volei/notificacoes/resumo", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw Error();
        const data = await response.json();
        if (active) {
          setSummary(data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        inflight = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("volley-notifications-changed", refresh);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("volley-notifications-changed", refresh);
    };
  }, [pathname]);
  const total = summary ? summary.pendingMembers + summary.openComplaints : 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="vn-bell"
          aria-label={
            summary ? `Notificações: ${total} pendências` : "Notificações"
          }
        >
          <Bell aria-hidden="true" />
          {total > 0 && (
            <span className="vn-bell-count">{total > 99 ? "99+" : total}</span>
          )}
          {error && (
            <span className="vn-bell-error" aria-hidden="true">
              !
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="vn-popover" align="end" collisionPadding={12}>
        <header>
          <h2>Central de solicitações</h2>
          <span>{summary ? `${total} pendentes` : "Atualizando…"}</span>
        </header>
        {error && (
          <p role="status">
            Não foi possível atualizar agora. Você pode abrir a central para
            conferir.
          </p>
        )}
        {summary && (
          <>
            <Link
              href="/admin/volei/notificacoes?tipo=cadastros"
              onClick={() => setOpen(false)}
            >
              <UserPlus aria-hidden="true" />
              <span>
                <strong>Novos membros</strong>
                <small>{summary.pendingMembers} aguardando aprovação</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link
              href="/admin/volei/notificacoes?tipo=queixas"
              onClick={() => setOpen(false)}
            >
              <MessageSquare aria-hidden="true" />
              <span>
                <strong>Queixas e relatos</strong>
                <small>
                  {summary.openComplaints} aguardando atendimento
                  {summary.unreadComplaints
                    ? ` · ${summary.unreadComplaints} não lidos`
                    : ""}
                </small>
              </span>
              <ChevronRight aria-hidden="true" />
            </Link>
            {total === 0 && (
              <p className="vn-all-done">
                Tudo em dia. Nenhuma solicitação pendente.
              </p>
            )}
          </>
        )}
        <Link
          className="vn-view-all"
          href="/admin/volei/notificacoes"
          onClick={() => setOpen(false)}
        >
          Ver todas as solicitações
        </Link>
        <p className="vn-popover-hint">
          O alerta permanece até você atender às pendências.
        </p>
      </PopoverContent>
    </Popover>
  );
}

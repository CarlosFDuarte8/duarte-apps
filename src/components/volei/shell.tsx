"use client";
import Link from "next/link";
import { LinkPending } from "./link-pending";
import { ActivityProvider } from "./activity";
import { CircleHelp, PanelLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutVolei as logout } from "@/app/volei/entrar/actions";
import { VolleyIcon } from "./volley-icon";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import "./shell.css";
import "@/components/ui/shadcn.css";
import "./mobile.css";
import "./theme.css";
import "./color-mode.css";
export function VoleiShell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (path?.includes("lista-presenca") || path?.includes("entrar")) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [path, router]);
  const links = admin
    ? ([
        ["/admin/volei", "Visão geral", "ball", "Jogos"],
        ["/admin/volei/membros", "Membros", "users", "Membros"],
        ["/admin/volei/convidados", "Convidados", "users", "Convidados"],
        ["/admin/volei/frequencia", "Frequência", "check", "Frequência"],
        ["/volei", "Área pública", "arrow", "Público"],
      ] as const)
    : ([
        ["/volei", "Jogos e presenças", "ball", "Jogos"],
        ["/volei/meu-cadastro", "Meu cadastro", "users", "Meu cadastro"],
        ["/volei/entrar", "Acesso administrativo", "shield", "Admin"],
      ] as const);
  return (
    <ActivityProvider>
      <div className={`volley-app${collapsed ? " volley-sidebar-collapsed" : ""}`}>
        <aside className="volley-sidebar" id="volley-navigation">
          <Link
            href={admin ? "/admin/volei" : "/volei"}
            className="volley-brand"
          >
            <span>
              <VolleyIcon name="ball" width="30" height="30" />
            </span>
            <div>
              QUADRA<small>VÔLEI DA GALERA</small>
            </div>
          </Link>
          <div className="volley-mode">
            {admin ? "GESTÃO DO GRUPO" : "DENTRO DE QUADRA"}
          </div>
          <nav aria-label="Navegação do vôlei">
            {links.map(([href, label, icon, mobileLabel]) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={collapsed ? label : undefined}
                style={{ position: "relative" }}
                aria-current={
                  path === href ||
                  (href === "/volei" &&
                    !admin &&
                    path?.startsWith("/volei/jogo/")) ||
                  (href === "/admin/volei" &&
                    path?.startsWith("/admin/volei/") &&
                    !path?.startsWith("/admin/volei/membros") &&
                    !path?.startsWith("/admin/volei/convidados") &&
                    !path?.startsWith("/admin/volei/notificacoes") &&
                    !path?.startsWith("/admin/volei/frequencia")) ||
                  ((href === "/admin/volei/membros" ||
                    href === "/admin/volei/convidados" ||
                    href === "/admin/volei/frequencia") &&
                    path?.startsWith(`${href}/`))
                    ? "page"
                    : undefined
                }
              >
                <span aria-hidden="true">
                  <VolleyIcon name={icon} />
                </span>
                <span className="volley-nav-label">{label}</span>
                <span className="volley-nav-mobile-label">{mobileLabel}</span>
                <LinkPending />
              </Link>
            ))}
          </nav>
          <footer>
            <div className="volley-account">
              <span><VolleyIcon name={admin ? "shield" : "ball"} /></span>
              <div><strong>{admin ? "Administrador" : "Vôlei da galera"}</strong><small>{admin ? "Gestão do grupo" : "Área dos participantes"}</small></div>
            </div>
            {admin ? (
              <>
                <Link href="/admin">Sistema de escalas ↗</Link>
                <form action={logout}>
                  <Button variant="outline" type="submit" aria-label="Sair da conta"><LogOut aria-hidden="true" /><span>Sair da conta</span></Button>
                </form>
              </>
            ) : (
              <span>Organize. Confirme. Jogue.</span>
            )}
          </footer>
        </aside>
        <div className="volley-body">
          <header className="volley-top">
            <Link
              href={admin ? "/admin/volei" : "/volei"}
              className="volley-mobile-brand"
              aria-label={
                admin
                  ? "Quadra — painel administrativo"
                  : "Quadra — jogos e presenças"
              }
            >
              <VolleyIcon name="ball" width="28" height="28" />
              <span>
                QUADRA
                <small>{admin ? "ADMINISTRATIVO" : "VÔLEI DA GALERA"}</small>
              </span>
            </Link>
            <div className="vx-desktop-context">
              <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-controls="volley-navigation" aria-expanded={!collapsed} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}><PanelLeft aria-hidden="true" /></Button>
              <span className="volley-header-divider" />
              <strong>{path?.includes("notificacoes") ? "Solicitações" : path?.includes("ajuda") ? "Ajuda" : links.find(([href]) => path === href || (href !== "/admin/volei" && href !== "/volei" && path?.startsWith(`${href}/`)))?.[1] ?? (admin ? "Gestão do encontro" : "Jogos e presenças")}</strong>
            </div>
            <div className="vn-header-actions">
              <Link
                href={admin ? "/admin/volei/ajuda" : "/volei/ajuda"}
                className="volley-help-link volley-header-icon"
                aria-label="Ajuda e orientações"
                title="Ajuda e orientações"
              >
                <CircleHelp aria-hidden="true" />
              </Link>
              {admin && <NotificationBell />}
              <ThemeToggle />
              <span className="volley-tag">● Vôlei</span>
              {admin && (
                <form action={logout} className="volley-mobile-logout">
                  <button type="submit">Sair</button>
                </form>
              )}
            </div>
          </header>
          <div className="volley-content">{children}</div>
        </div>
      </div>
    </ActivityProvider>
  );
}
export function AdminSystemShell({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const pathname = usePathname();
  return pathname?.startsWith("/admin/volei") ? (
    <VoleiShell admin>{children}</VoleiShell>
  ) : (
    fallback
  );
}

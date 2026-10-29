"use client";
import Link from "next/link";
import { LinkPending } from "./link-pending";
import { ActivityProvider } from "./activity";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { logoutVolei as logout } from "@/app/volei/entrar/actions";
import { VolleyIcon } from "./volley-icon";
import { NotificationBell } from "./notification-bell";
import "./shell.css";
import "@/components/ui/shadcn.css";
import "./mobile.css";
export function VoleiShell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
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
      <div className="volley-app">
        <aside className="volley-sidebar">
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
          <div className="volley-sidebar-note">
            <strong>Um só grupo. Uma só quadra.</strong>
            <p>Confira as vagas disponíveis em cada dia de jogo.</p>
          </div>
          <footer>
            {admin ? (
              <>
                <Link href="/admin">Sistema de escalas ↗</Link>
                <form action={logout}>
                  <button>Sair da conta</button>
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
            <span>{admin ? "PAINEL ADMINISTRATIVO" : "ÁREA PÚBLICA"}</span>
            <div className="vn-header-actions">
              <Link
                href={admin ? "/admin/volei/ajuda" : "/volei/ajuda"}
                className="volley-link"
              >
                Ajuda
              </Link>
              {admin && <NotificationBell />}
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

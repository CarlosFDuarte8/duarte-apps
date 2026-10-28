"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { logoutVolei as logout } from "@/app/volei/entrar/actions";
import { VolleyIcon } from "./volley-icon";
import "./shell.css";
import "@/components/ui/shadcn.css";
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
        ["/admin/volei", "Visão geral", "ball"],
        ["/admin/volei/membros", "Membros", "users"],
        ["/admin/volei/frequencia", "Frequência", "check"],
        ["/volei", "Área pública", "arrow"],
      ] as const)
    : ([
        ["/volei", "Jogos e presenças", "ball"],
        ["/volei/entrar", "Acesso administrativo", "shield"],
      ] as const);
  return (
    <div className="volley-app">
      <aside className="volley-sidebar">
        <Link href={admin ? "/admin/volei" : "/volei"} className="volley-brand">
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
          {links.map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href ||
                (href === "/volei" &&
                  !admin &&
                  path?.startsWith("/volei/jogo/")) ||
                (href === "/admin/volei" &&
                  path?.startsWith("/admin/volei/") &&
                  !path?.startsWith("/admin/volei/membros") &&
                  !path?.startsWith("/admin/volei/frequencia")) ||
                (href === "/admin/volei/frequencia" &&
                  path?.startsWith("/admin/volei/frequencia/"))
                  ? "page"
                  : undefined
              }
            >
              <span>
                <VolleyIcon name={icon} />
              </span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="volley-sidebar-note">
          <strong>18 jogadores. Um só grupo.</strong>
          <p>3 times de 6, com inscrição por ordem de confirmação.</p>
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
          <span>{admin ? "PAINEL ADMINISTRATIVO" : "ÁREA PÚBLICA"}</span>
          <span className="volley-tag">● Vôlei</span>
          {admin && (
            <form action={logout} className="volley-mobile-logout">
              <button type="submit">Sair</button>
            </form>
          )}
        </header>
        <div className="volley-content">{children}</div>
      </div>
    </div>
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

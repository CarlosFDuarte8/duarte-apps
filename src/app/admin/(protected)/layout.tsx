import Link from "next/link";
import { requireAdmin } from "@/lib/escalas/supabase";
import { AdminNav } from "@/components/escalas/admin-nav";
import { logout } from "../actions";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <>
      <header className="sc-admin-bar">
        <div className="sc-admin-bar-top">
          <Link className="sc-admin-brand" href="/admin">
            <span className="sc-admin-mark" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="5" width="16" height="16" rx="3" />
                <path d="M8 3v4m8-4v4M4 10h16m-12 5 2 2 5-5" />
              </svg>
            </span>
            <span>
              <strong>CCB · INCRA-08</strong>
              <small>Gestão de escalas</small>
            </span>
          </Link>
          <div className="sc-admin-bar-actions">
            <Link className="sc-admin-public" href="/escalas">
              Área pública
            </Link>
            <form action={logout}>
              <button className="sc-btn sc-btn-ghost">Sair</button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      {children}
    </>
  );
}

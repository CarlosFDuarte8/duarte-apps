import Link from "next/link";
import { requireAdmin } from "@/lib/escalas/supabase";
import { AdminNav } from "@/components/escalas/admin-nav";
import { BrandMark, NavIcon } from "@/components/escalas/nav-icons";
import { logout } from "../actions";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const brand = (
    <Link className="sc-brand" href="/admin">
      <BrandMark />
      <span>
        <strong>CCB · INCRA-08</strong>
        <small>Gestão de escalas</small>
      </span>
    </Link>
  );
  return (
    <div className="sc-app">
      <aside className="sc-sidebar">
        {brand}
        <AdminNav variant="side" />
        <div className="sc-sidebar-foot">
          <Link href="/escalas">
            <NavIcon name="globe" />
            <span>Área pública</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="sc-sideitem">
              <NavIcon name="logout" />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>
      <div className="sc-app-main">
        <header className="sc-mobilebar">
          {brand}
          <div className="sc-mobilebar-actions">
            <Link href="/escalas" aria-label="Área pública">
              <NavIcon name="globe" />
            </Link>
            <form action={logout}>
              <button type="submit" className="sc-sideitem" aria-label="Sair">
                <NavIcon name="logout" />
              </button>
            </form>
          </div>
        </header>
        <div className="sc-app-content">{children}</div>
      </div>
      <AdminNav variant="bottom" />
    </div>
  );
}

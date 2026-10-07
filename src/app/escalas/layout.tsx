import "@/components/escalas/escalas.css";
import Link from "next/link";
import { BrandMark } from "@/components/escalas/nav-icons";
import { PublicNav } from "@/components/escalas/public-nav";
export const metadata = {
  title: "Escalas | CCB INCRA-08",
  description:
    "Calendário de escalas publicadas da Congregação Cristã no Brasil – INCRA-08.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="sc sc-public">
      <header className="sc-pubbar">
        <Link className="sc-brand" href="/escalas">
          <BrandMark />
          <span>
            <strong>CCB · INCRA-08</strong>
            <small>Escalas da congregação</small>
          </span>
        </Link>
        <PublicNav variant="top" />
      </header>
      {children}
      <PublicNav variant="bottom" />
    </main>
  );
}

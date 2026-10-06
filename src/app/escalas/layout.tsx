import "@/components/escalas/escalas.css";
import Link from "next/link";
export const metadata = {
  title: "Escalas | CCB INCRA-08",
  description:
    "Calendário de escalas publicadas da Congregação Cristã no Brasil – INCRA-08.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="sc">
      <header className="sc-pagehead">
        <div>
          <p className="sc-eyebrow">Congregação Cristã no Brasil · INCRA-08</p>
          <p className="sc-pagehead-title">Escalas da congregação</p>
        </div>
        <Link className="sc-pagehead-link" href="/admin">
          Área administrativa
        </Link>
      </header>
      {children}
    </main>
  );
}

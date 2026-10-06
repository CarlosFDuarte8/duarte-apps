import Link from "next/link";
import "@/components/escalas/login.css";
import { LoginForm } from "@/components/escalas/forms";
import { configured } from "@/lib/escalas/supabase";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  return (
    <section className="sc-login" aria-labelledby="login-title">
      <div className="sc-login-card">
        <div className="sc-login-brand">
          <span className="sc-login-mark" aria-hidden="true">
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
          <div>
            <strong>CCB · INCRA-08</strong>
            <span>Gestão de escalas</span>
          </div>
        </div>
        <header className="sc-login-heading">
          <p className="sc-login-eyebrow">ÁREA ADMINISTRATIVA</p>
          <h1 id="login-title">Bem-vindo de volta</h1>
          <p>
            Entre com sua conta para organizar as escalas e cuidar dos próximos
            encontros.
          </p>
        </header>
        {denied && (
          <p className="sc-login-error" role="alert">
            Esta conta não tem permissão de administrador.
          </p>
        )}
        {configured() ? (
          <LoginForm />
        ) : (
          <div className="sc-card">
            Configure as variáveis do Supabase, execute a migration e cadastre o
            primeiro administrador. Instruções em docs/ESCALAS.md.
          </div>
        )}
        <p className="sc-login-help">
          Precisa de acesso? Fale com o responsável pelas escalas.
        </p>
        <div className="sc-login-footer">
          <Link href="/escalas">
            <span aria-hidden="true">←</span> Consultar escalas públicas
          </Link>
        </div>
      </div>
      <p className="sc-login-caption">
        Congregação Cristã no Brasil · INCRA-08
      </p>
    </section>
  );
}

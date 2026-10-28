import { VoleiLogin } from "@/components/volei/login";
import { configured } from "@/lib/escalas/supabase";
export default function Page() {
  return (
    <>
      <section className="volley-hero">
        <span className="volley-eyebrow">FORA DA QUADRA, TUDO ORGANIZADO</span>
        <h1>Quem organiza também joga.</h1>
        <p>
          Seu espaço para cuidar dos membros, dos jogos e das próximas partidas.
        </p>
      </section>
      {configured() ? (
        <VoleiLogin />
      ) : (
        <section className="volley-card">
          Configure o Supabase para acessar o painel administrativo.
        </section>
      )}
    </>
  );
}

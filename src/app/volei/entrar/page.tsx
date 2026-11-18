import { VoleiLogin } from "@/components/volei/login";
import { configured } from "@/lib/escalas/supabase";
import { VolleyHero } from "@/components/volei/page-frame";
import styles from "@/components/volei/login.module.css";

export default function Page() {
  return (
    <div className={styles.page}>
      <VolleyHero
        id="volley-login-hero-title"
        eyebrow="FORA DA QUADRA, TUDO ORGANIZADO"
        title={<>Quem organiza também <span>joga.</span></>}
        description="Seu espaço para cuidar dos membros, dos jogos e das próximas partidas."
        underline
      />
      {configured() ? (
        <VoleiLogin />
      ) : (
        <section className={styles.setup}>
          Configure o Supabase para acessar o painel administrativo.
        </section>
      )}
    </div>
  );
}

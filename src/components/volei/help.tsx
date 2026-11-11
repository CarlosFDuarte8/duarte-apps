import Link from "next/link";
import { helpSections } from "@/lib/volei/help";
import styles from "./help.module.css";

export function VoleiHelp({ admin = false }: { admin?: boolean }) {
  return (
    <>
      <section className="volley-hero">
        <span className="volley-eyebrow">ACESSO E ORIENTAÇÕES</span>
        <h1>Como podemos ajudar?</h1>
        <p>Dicas para acessar o grupo e resolver os problemas mais comuns.</p>
      </section>
      {admin && (
        <Link className="sc-button" href="/admin/volei/membros">
          Abrir membros para liberar acesso
        </Link>
      )}
      {admin && (
        <section className={`volley-card ${styles.section}`}>
          <h2>Avisos no computador</h2>
          <p>
            No sino do painel, escolha Ativar avisos neste navegador e autorize.
            Você receberá novos pedidos de cadastro e confirmações de presença
            mesmo com a aba fechada. Use Testar aviso para conferir a entrega.
          </p>
          <p>
            É necessário ativar o serviço no servidor primeiro. Se não receber,
            confira a permissão do site, as notificações do navegador no sistema
            e o modo Não Perturbe. Sair da conta tenta desligar os avisos neste
            navegador; para garantir, desative-os pelo sino antes de sair de um
            computador compartilhado.
          </p>
        </section>
      )}
      {helpSections.map((section) => (
        <section
          className={`volley-card ${styles.section}`}
          key={section.title}
        >
          <h2>{section.title}</h2>
          <div>
            {section.items.map(([question, answer]) => (
              <details className={styles.item} key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <Link className="volley-link" href={admin ? "/admin/volei" : "/volei"}>
        ← Voltar aos jogos
      </Link>
    </>
  );
}

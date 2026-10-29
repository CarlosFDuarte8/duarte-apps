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

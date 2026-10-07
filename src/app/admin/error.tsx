"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="sc-card sc-notice" role="alert">
      <h2>Não foi possível carregar a administração.</h2>
      <p>
        Confira a conexão e a configuração do banco. Nenhuma alteração foi
        confirmada por esta tela.
      </p>
      <button className="sc-btn" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}

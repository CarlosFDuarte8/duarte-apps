"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="sc-card sc-notice" role="alert">
      <h2>Não foi possível carregar as escalas.</h2>
      <p>Tente novamente em instantes.</p>
      <button className="sc-btn" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}

"use client";
import { useActionState } from "react";
import { loginVolei } from "@/app/volei/entrar/actions";
export function VoleiLogin() {
  const [error, action, pending] = useActionState(loginVolei, "");
  return (
    <form className="volley-card volley-form" action={action}>
      <h2>Acesso do responsável</h2>
      <p className="volley-muted">
        Entre com a mesma conta do sistema de escalas. Somente o responsável
        autorizado pode gerenciar o grupo.
      </p>
      <label>
        E-mail
        <input type="email" autoComplete="username" name="email" required />
      </label>
      <label>
        Senha
        <input
          type="password"
          autoComplete="current-password"
          name="password"
          required
        />
      </label>
      {error && (
        <p role="alert" className="volley-error">
          {error}
        </p>
      )}
      <button disabled={pending}>
        {pending ? "Entrando…" : "Entrar no painel"}
      </button>
    </form>
  );
}

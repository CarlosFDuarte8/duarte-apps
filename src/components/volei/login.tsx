"use client";
import { useActionState } from "react";
import { loginVolei } from "@/app/volei/entrar/actions";
import { useOperationStatus } from "./activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function VoleiLogin() {
  const [error, action, pending] = useActionState(loginVolei, "");
  useOperationStatus(pending, "Entrando no painel…", error);
  return (
    <form className="volley-card volley-form" action={action}>
      <h2>Acesso do responsável</h2>
      <p className="volley-muted">
        Entre com a mesma conta do sistema de escalas. Somente o responsável
        autorizado pode gerenciar o grupo.
      </p>
      <label>
        E-mail
        <Input type="email" autoComplete="username" name="email" required />
      </label>
      <label>
        Senha
        <Input
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
      <Button loading={pending} loadingText="Entrando…">
        {pending ? "Entrando…" : "Entrar no painel"}
      </Button>
    </form>
  );
}

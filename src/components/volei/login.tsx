"use client";

import { useActionState, useState } from "react";
import { ArrowRight, EyeOff, Eye, LockKeyhole, Mail, Shield } from "lucide-react";
import { loginVolei } from "@/app/volei/entrar/actions";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useOperationStatus } from "./activity";
import { VolleyCard } from "./page-frame";
import styles from "./login.module.css";

export function VoleiLogin() {
  const [error, action, pending] = useActionState(loginVolei, "");
  const [showPassword, setShowPassword] = useState(false);

  useOperationStatus(pending, "Entrando no painel…", error);

  return (
    <VolleyCard className={styles.card}>
      <CardHeader className={styles.cardHeader}>
        <span className={styles.badge} aria-hidden="true"><Shield /></span>
        <h2 id="volley-login-title" className={styles.title}>Acesso do responsável</h2>
        <p id="volley-login-description" className={styles.description}>
          Entre com a mesma conta do sistema de escalas.
        </p>
      </CardHeader>
      <CardContent className={styles.cardContent}>
        <form
          className={styles.form}
          action={action}
          aria-labelledby="volley-login-title"
          aria-describedby="volley-login-description"
          aria-busy={pending}
        >
          <div className={styles.field}>
            <label htmlFor="volley-login-email">E-mail</label>
            <InputGroup>
              <InputGroupInput
                id="volley-login-email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                name="email"
                required
                placeholder="Digite seu e-mail"
              />
              <InputGroupAddon><Mail aria-hidden="true" /></InputGroupAddon>
            </InputGroup>
          </div>
          <div className={styles.field}>
            <label htmlFor="volley-login-password">Senha</label>
            <InputGroup>
              <InputGroupInput
                id="volley-login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                name="password"
                required
                placeholder="Digite sua senha"
              />
              <InputGroupAddon><LockKeyhole aria-hidden="true" /></InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-controls="volley-login-password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </InputGroupAddon>
            </InputGroup>
          </div>
          {error && !pending && <p role="alert" className={styles.error}>{error}</p>}
          <Button className={styles.submit} type="submit" disabled={pending}>
            {pending ? "Entrando…" : "Entrar no painel"}
            {!pending && <ArrowRight aria-hidden="true" />}
          </Button>
        </form>
      </CardContent>
    </VolleyCard>
  );
}

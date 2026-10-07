"use client";
import { useActionState, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [error, submit, isSubmitting] = useActionState(
    async (_previousError: string, formData: FormData) => {
      try {
        const result = await login({
          email: String(formData.get("email") ?? "").trim(),
          password: String(formData.get("password") ?? ""),
        });
        return result.error;
      } catch (error) {
        // Preserve Next.js redirects while displaying request failures.
        unstable_rethrow(error);
        return "Não foi possível conectar. Tente novamente em instantes.";
      }
    },
    "",
  );
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form
      className="sc-form sc-login-form"
      aria-busy={isSubmitting}
      action={submit}
    >
      <div>
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="seu@email.com"
          required
          name="email"
        />
      </div>
      <div>
        <label htmlFor="login-password">Senha</label>
        <div className="sc-password-field">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            spellCheck={false}
            autoCapitalize="none"
            required
            name="password"
          />
          <button
            type="button"
            className="sc-password-toggle"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-controls="login-password"
            onClick={() => setShowPassword((value) => !value)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {showPassword ? (
                <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3.3 4.1M6.5 6.5A20 20 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.5-1.5" />
              ) : (
                <>
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
            <span>{showPassword ? "Ocultar" : "Mostrar"}</span>
          </button>
        </div>
      </div>
      {error && !isSubmitting && (
        <p className="sc-login-error" role="alert">
          {error}
        </p>
      )}
      <button className="sc-login-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Acessar administração"}
        {!isSubmitting && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}

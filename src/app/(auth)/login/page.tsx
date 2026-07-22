"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type ActionResult } from "@/app/actions/auth";

const initialState: ActionResult = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => login(formData),
    initialState,
  );

  return (
    <div className="auth-page">
      <div className="auth-box">
        <p className="auth-title">Central Contábil</p>
        <p className="auth-sub">Entre com seu e-mail corporativo da Navecon.</p>

        {state.error && <div className="auth-error">{state.error}</div>}

        <form action={formAction}>
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button type="submit" className="auth-btn" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-switch">
          Ainda não tem acesso? <Link href="/signup">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

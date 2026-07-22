"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type ActionResult } from "@/app/actions/auth";

const initialState: ActionResult = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => signup(formData),
    initialState,
  );

  return (
    <div className="auth-page">
      <div className="auth-box">
        <p className="auth-title">Criar acesso</p>
        <p className="auth-sub">Use seu e-mail corporativo no formato nome_da_pessoa@navecon.net.br.</p>

        {state.error && <div className="auth-error">{state.error}</div>}

        <form action={formAction}>
          <div className="auth-field">
            <label htmlFor="name">Nome completo</label>
            <input id="name" name="name" type="text" required autoComplete="name" />
          </div>
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" required minLength={4} autoComplete="new-password" />
          </div>
          <div className="auth-field">
            <label htmlFor="birthday">Data de nascimento (opcional)</label>
            <input id="birthday" name="birthday" type="date" />
          </div>
          <button type="submit" className="auth-btn" disabled={pending}>
            {pending ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="auth-switch">
          Já tem acesso? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

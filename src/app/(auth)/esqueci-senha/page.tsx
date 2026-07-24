"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { solicitarResetSenha, type ActionResult } from "@/app/actions/password-reset";

const initialState: ActionResult = { error: null };

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => solicitarResetSenha(formData),
    initialState,
  );

  return (
    <div className="auth-page">
      <Image src="/navecon-logo.png" alt="Navecon" width={180} height={34} className="logo auth-logo" priority />
      <div className="auth-box">
        <p className="auth-title">Esqueci minha senha</p>
        <p className="auth-sub">Informe seu e-mail corporativo e mandamos um link para você escolher uma nova senha.</p>

        {state.error && <div className="auth-error">{state.error}</div>}
        {state.success && (
          <div className="auth-success">
            Se esse e-mail tiver uma conta na Central Contábil, você vai receber um link de redefinição em instantes.
            Confira também a caixa de spam.
          </div>
        )}

        {!state.success && (
          <form action={formAction}>
            <div className="auth-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <button type="submit" className="auth-btn" disabled={pending}>
              {pending ? "Enviando..." : "Enviar link de redefinição"}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Lembrou a senha? <Link href="/login">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
}

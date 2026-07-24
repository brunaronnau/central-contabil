"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { redefinirSenha, type ActionResult } from "@/app/actions/password-reset";

const initialState: ActionResult = { error: null };

function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => redefinirSenha(formData),
    initialState,
  );

  if (!token) {
    return <div className="auth-error">Link inválido — falta o token de redefinição. Peça um novo em &quot;Esqueci minha senha&quot;.</div>;
  }

  if (state.success) {
    return (
      <>
        <div className="auth-success">Senha redefinida com sucesso.</div>
        <p className="auth-switch">
          <Link href="/login">Ir para o login</Link>
        </p>
      </>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      {state.error && <div className="auth-error">{state.error}</div>}
      <div className="auth-field">
        <label htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" required minLength={4} autoComplete="new-password" />
      </div>
      <div className="auth-field">
        <label htmlFor="confirmar">Confirmar nova senha</label>
        <input id="confirmar" name="confirmar" type="password" required minLength={4} autoComplete="new-password" />
      </div>
      <button type="submit" className="auth-btn" disabled={pending}>
        {pending ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="auth-page">
      <Image src="/navecon-logo.png" alt="Navecon" width={180} height={34} className="logo auth-logo" priority />
      <div className="auth-box">
        <p className="auth-title">Escolher nova senha</p>
        <p className="auth-sub">Defina uma nova senha para sua conta.</p>
        <Suspense fallback={null}>
          <RedefinirSenhaForm />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signup, type ActionResult } from "@/app/actions/auth";
import { resizeImageFile } from "@/lib/resize-image";

const initialState: ActionResult = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => signup(formData),
    initialState,
  );
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(file: File) {
    setPhotoError(null);
    try {
      setPhotoData(await resizeImageFile(file, 160));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "erro ao processar imagem");
    }
  }

  return (
    <div className="auth-page">
      <Image src="/navecon-logo.png" alt="Navecon" width={180} height={34} className="logo auth-logo" priority />
      <div className="auth-box">
        <p className="auth-title">Criar acesso</p>
        <p className="auth-sub">Use seu e-mail corporativo no formato nome_da_pessoa@navecon.net.br.</p>

        {state.error && <div className="auth-error">{state.error}</div>}

        <form action={formAction}>
          <input type="hidden" name="photo" value={photoData ?? ""} />
          <div className="auth-photo-row">
            <div className="auth-photo-preview">
              {photoData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoData} alt="" />
              ) : (
                "Foto"
              )}
            </div>
            <div>
              <button type="button" className="auth-photo-btn" onClick={() => photoInputRef.current?.click()}>
                Escolher foto
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handlePhotoChange(e.target.files[0])}
              />
              {photoError && <p className="small-note" style={{ color: "var(--danger)", marginTop: 4 }}>{photoError}</p>}
            </div>
          </div>

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

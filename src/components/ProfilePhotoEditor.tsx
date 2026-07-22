"use client";

import { useRef, useState, useTransition } from "react";
import { resizeImageFile } from "@/lib/resize-image";
import { updateMyPhoto } from "@/app/actions/users";

export function ProfilePhotoEditor({ photo }: { photo: string | null }) {
  const [preview, setPreview] = useState<string | null>(photo);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(file: File) {
    setError(null);
    try {
      const dataUrl = await resizeImageFile(file, 160);
      setPreview(dataUrl);
      startTransition(async () => {
        await updateMyPhoto(dataUrl);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro ao processar imagem");
    }
  }

  return (
    <div className="auth-photo-row">
      <div className="auth-photo-preview">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" />
        ) : (
          "Foto"
        )}
      </div>
      <div>
        <button type="button" className="auth-photo-btn" onClick={() => inputRef.current?.click()} disabled={pending}>
          {pending ? "Salvando..." : "Trocar foto"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleChange(e.target.files[0])}
        />
        {error && <p className="small-note" style={{ color: "var(--danger)", marginTop: 6 }}>{error}</p>}
      </div>
    </div>
  );
}

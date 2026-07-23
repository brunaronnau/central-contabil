"use client";

import { useTransition } from "react";
import { alertMeta } from "@/app/actions/mural-metas";

export function AlertMetaButton({ metaId }: { metaId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const msg = (prompt("Mensagem de atenção para a equipe (opcional):", "") || "").trim();
    startTransition(async () => {
      const fd = new FormData();
      if (msg) fd.set("text", msg);
      await alertMeta(metaId, fd);
    });
  }

  return (
    <button type="button" className="btn alert-btn" onClick={handleClick} disabled={pending}>
      ⚠️ Disparar alerta
    </button>
  );
}

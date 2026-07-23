"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkVotacoesEncerradas } from "@/app/actions/mural-votacoes";

const INTERVAL_MS = 60000;

/**
 * No legado, um tick de 60s expirava recados e encerrava votações vencidas
 * na tela sem precisar recarregar. Aqui os dados vêm do banco (a expiração é
 * calculada na query/no render), então só precisamos re-buscar periodicamente
 * para o mesmo efeito: recados que passaram do prazo somem, votações
 * encerradas mudam de estado, sem o usuário precisar dar F5. O mesmo tick
 * também dispara a notificação de "votação encerrada" (checkVotacoesEncerradas).
 */
export function MuralAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(async () => {
      await checkVotacoesEncerradas();
      router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}

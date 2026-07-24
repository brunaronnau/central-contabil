"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 60000;

/**
 * Mesma ideia do MuralAutoRefresh: como os dados vêm do servidor (Server
 * Components), um router.refresh() periódico já é suficiente pra outros
 * administradores enxergarem notas/eventos/férias uns dos outros sem
 * precisar dar F5.
 */
export function LiderancaAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}

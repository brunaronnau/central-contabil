"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 60000;

/**
 * Dados vêm do servidor (Server Components) — um router.refresh() periódico
 * já é suficiente pra um analista ver o que outro registrou sem precisar F5.
 */
export function FichaAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}

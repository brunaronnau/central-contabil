import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

/**
 * Roda a cada carregamento de página (ver (app)/layout.tsx) — é barato (uma
 * query + no máximo alguns inserts, só em dias com aniversariante) e evita
 * depender de um processo em segundo plano. AniversarioNotificado garante que
 * cada pessoa só gera o aviso uma vez por ano, mesmo com várias pessoas
 * navegando no site ao mesmo tempo no dia.
 */
export async function checkAniversariosHoje() {
  const now = new Date();
  const todayMD = now.getUTCMonth() * 100 + now.getUTCDate();
  const ano = now.getUTCFullYear();

  const usuarios = await prisma.user.findMany({
    where: { birthday: { not: null } },
    select: { id: true, name: true, birthday: true },
  });

  const aniversariantes = usuarios.filter((u) => {
    const b = u.birthday!;
    return b.getUTCMonth() * 100 + b.getUTCDate() === todayMD;
  });
  if (aniversariantes.length === 0) return;

  for (const u of aniversariantes) {
    try {
      await prisma.aniversarioNotificado.create({ data: { userId: u.id, ano } });
    } catch {
      // já notificado esse ano (violação do @@unique) — não repete o aviso
      continue;
    }
    await notify({ kind: "aniversario", titulo: `Hoje é aniversário de ${u.name}!`, href: "/aniversariantes" });
  }
}

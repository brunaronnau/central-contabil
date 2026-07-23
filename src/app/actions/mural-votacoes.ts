"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notify } from "@/lib/notify";

export async function createVotacao(formData: FormData) {
  const user = await requireUser();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const opcoes = formData
    .getAll("opcoes")
    .map((o) => String(o).trim())
    .filter(Boolean);

  if (!titulo || opcoes.length < 2) return;

  const duracaoHoras = Number(formData.get("duration") ?? 72);
  const encerraEm = new Date(Date.now() + duracaoHoras * 3600000);

  await prisma.votacao.create({
    data: {
      titulo,
      encerraEm,
      authorId: user.id,
      opcoes: { create: opcoes.map((texto, i) => ({ texto, ordem: i })) },
    },
  });

  await notify({
    kind: "votacao",
    titulo: `Nova votação: ${titulo}`,
    sub: `Criada por ${user.name}`,
    href: "/mural",
    excludeUserId: user.id,
  });

  revalidatePath("/mural");
}

export async function deleteVotacao(votacaoId: string) {
  const user = await requireUser();
  const votacao = await prisma.votacao.findUnique({ where: { id: votacaoId } });
  if (!votacao) return;
  if (!user.isAdmin && votacao.authorId !== user.id) throw new Error("Você não pode excluir esta votação.");

  await prisma.votacao.delete({ where: { id: votacaoId } });
  revalidatePath("/mural");
}

export async function voteVotacao(votacaoId: string, opcaoId: string) {
  const user = await requireUser();
  const votacao = await prisma.votacao.findUnique({ where: { id: votacaoId } });
  if (!votacao) return;
  if (votacao.encerraEm <= new Date()) throw new Error("Esta votação já foi encerrada.");

  const opcao = await prisma.votacaoOpcao.findUnique({ where: { id: opcaoId } });
  if (!opcao || opcao.votacaoId !== votacaoId) throw new Error("Opção inválida para esta votação.");

  await prisma.votacaoVoto.upsert({
    where: { votacaoId_userId: { votacaoId, userId: user.id } },
    create: { votacaoId, opcaoId, userId: user.id },
    update: { opcaoId },
  });

  revalidatePath("/mural");
}

/**
 * Sem um processo em segundo plano no servidor, o encerramento de uma
 * votação só é percebido quando alguém está com o Mural aberto — chamada
 * pelo MuralAutoRefresh a cada 60s e também ao carregar a página.
 */
export async function checkVotacoesEncerradas() {
  await requireUser();

  const pendentes = await prisma.votacao.findMany({
    where: { encerraEm: { lte: new Date() }, notificouEncerramento: false },
    include: { opcoes: { include: { votos: true } } },
  });
  if (pendentes.length === 0) return;

  for (const votacao of pendentes) {
    const maisVotada = [...votacao.opcoes].sort((a, b) => b.votos.length - a.votos.length)[0];
    const sub =
      maisVotada && maisVotada.votos.length > 0
        ? `Mais votada: ${maisVotada.texto} (${maisVotada.votos.length} voto${maisVotada.votos.length === 1 ? "" : "s"})`
        : "Ninguém votou.";
    await notify({ kind: "votacao", titulo: `Votação encerrada: ${votacao.titulo}`, sub, href: "/mural" });
    await prisma.votacao.update({ where: { id: votacao.id }, data: { notificouEncerramento: true } });
  }
  // Sem revalidatePath aqui de propósito: essa função também é chamada durante o
  // render da própria página do Mural (onde revalidatePath não é permitido) — o
  // caller cuida de atualizar a tela (router.refresh() no MuralAutoRefresh, ou o
  // próprio render da página já busca os dados atualizados em seguida).
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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

  await prisma.votacaoVoto.upsert({
    where: { votacaoId_userId: { votacaoId, userId: user.id } },
    create: { votacaoId, opcaoId, userId: user.id },
    update: { opcaoId },
  });

  revalidatePath("/mural");
}

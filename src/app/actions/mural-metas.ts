"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function createMeta(formData: FormData) {
  const user = await requireUser();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const endDateStr = String(formData.get("endDate") ?? "");
  const startDateStr = String(formData.get("startDate") ?? "");
  const reward = String(formData.get("reward") ?? "").trim();

  if (!titulo || !endDateStr) return;

  await prisma.meta.create({
    data: {
      titulo,
      descricao,
      endDate: new Date(endDateStr),
      startDate: startDateStr ? new Date(startDateStr) : null,
      reward: reward || null,
      authorId: user.id,
    },
  });

  revalidatePath("/mural");
}

function podeGerenciarMeta(meta: { authorId: string | null }, user: { id: string; isAdmin: boolean }) {
  return user.isAdmin || meta.authorId === user.id;
}

export async function deleteMeta(metaId: string) {
  const user = await requireUser();
  const meta = await prisma.meta.findUnique({ where: { id: metaId } });
  if (!meta) return;
  if (!podeGerenciarMeta(meta, user)) throw new Error("Você não pode excluir esta meta.");

  await prisma.meta.delete({ where: { id: metaId } });
  revalidatePath("/mural");
}

export async function concludeMeta(metaId: string) {
  const user = await requireUser();
  const meta = await prisma.meta.findUnique({ where: { id: metaId } });
  if (!meta) return;
  if (!podeGerenciarMeta(meta, user)) throw new Error("Você não pode concluir esta meta.");

  await prisma.meta.update({
    where: { id: metaId },
    data: {
      status: "CONCLUIDA",
      completedAt: new Date(),
      notas: { create: { text: "Meta concluída! 🎉", tipo: "CONCLUSAO", authorId: user.id } },
    },
  });

  revalidatePath("/mural");
}

export async function addMetaNote(metaId: string, formData: FormData) {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const meta = await prisma.meta.findUnique({ where: { id: metaId }, select: { id: true } });
  if (!meta) return;

  await prisma.metaNota.create({ data: { metaId, text, tipo: "NOTA", authorId: user.id } });
  revalidatePath("/mural");
}

export async function alertMeta(metaId: string, formData: FormData) {
  const user = await requireUser();
  const meta = await prisma.meta.findUnique({ where: { id: metaId } });
  if (!meta) return;
  if (!podeGerenciarMeta(meta, user)) throw new Error("Você não pode disparar alerta nesta meta.");

  const text = String(formData.get("text") ?? "").trim() || "Atenção necessária nesta meta!";
  await prisma.metaNota.create({ data: { metaId, text: `⚠️ ${text}`, tipo: "ALERTA", authorId: user.id } });
  revalidatePath("/mural");
}

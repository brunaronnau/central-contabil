"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

/* ==================== Notas & Metas ==================== */

export async function criarNota(formData: FormData) {
  const me = await requireAdmin();
  const tipo = formData.get("tipo") === "META" ? "META" : "OBSERVACAO";
  const titulo = String(formData.get("titulo") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!titulo || !texto) return;

  await prisma.liderancaNota.create({ data: { tipo, titulo, texto, authorId: me.id } });
  revalidatePath("/lideranca");
}

export async function alternarStatusNota(id: string) {
  await requireAdmin();
  const nota = await prisma.liderancaNota.findUnique({ where: { id }, select: { status: true } });
  if (!nota) return;
  await prisma.liderancaNota.update({
    where: { id },
    data: { status: nota.status === "CONCLUIDA" ? "ABERTA" : "CONCLUIDA" },
  });
  revalidatePath("/lideranca");
}

export async function excluirNota(id: string) {
  await requireAdmin();
  await prisma.liderancaNota.delete({ where: { id } });
  revalidatePath("/lideranca");
}

/* ==================== Calendário do time ==================== */

export async function criarEvento(formData: FormData) {
  const me = await requireAdmin();
  const dataStr = String(formData.get("data") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!dataStr || !titulo) return;

  await prisma.liderancaEvento.create({
    data: { data: new Date(dataStr), titulo, descricao: descricao || null, authorId: me.id },
  });
  revalidatePath("/lideranca");
}

export async function excluirEvento(id: string) {
  await requireAdmin();
  await prisma.liderancaEvento.delete({ where: { id } });
  revalidatePath("/lideranca");
}

/* ==================== Controle de férias ==================== */

export async function criarFerias(formData: FormData) {
  const me = await requireAdmin();
  const colaborador = String(formData.get("colaborador") ?? "").trim();
  const dataInicioStr = String(formData.get("dataInicio") ?? "");
  const dataFimStr = String(formData.get("dataFim") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();
  if (!colaborador || !dataInicioStr || !dataFimStr) return;

  await prisma.liderancaFerias.create({
    data: {
      colaborador,
      dataInicio: new Date(dataInicioStr),
      dataFim: new Date(dataFimStr),
      observacao: observacao || null,
      authorId: me.id,
    },
  });
  revalidatePath("/lideranca");
}

export async function excluirFerias(id: string) {
  await requireAdmin();
  await prisma.liderancaFerias.delete({ where: { id } });
  revalidatePath("/lideranca");
}

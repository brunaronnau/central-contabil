"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ReacaoTipo } from "@/generated/prisma/enums";

const MURAL_MAX_FILE_BYTES = 5 * 1024 * 1024;
// Abaixo do bodySizeLimit de 8mb das server actions (next.config.ts) — sobra
// margem para o texto e o overhead do multipart/form-data.
const MURAL_MAX_TOTAL_BYTES = 7 * 1024 * 1024;

export async function createRecado(formData: FormData) {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const pinned = formData.get("pinned") === "on";
  const duracaoHoras = Number(formData.get("duration") ?? 24);
  const expiresAt = new Date(Date.now() + duracaoHoras * 3600000);

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  let totalBytes = 0;
  for (const file of files) {
    if (file.size > MURAL_MAX_FILE_BYTES) {
      throw new Error(`O arquivo "${file.name}" excede o limite de 5MB.`);
    }
    totalBytes += file.size;
  }
  if (totalBytes > MURAL_MAX_TOTAL_BYTES) {
    throw new Error(`Os anexos somam ${(totalBytes / 1024 / 1024).toFixed(1)}MB — o limite total é 7MB por recado.`);
  }

  const recado = await prisma.recado.create({
    data: { text, pinned, expiresAt, authorId: user.id },
  });

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    await prisma.recadoAnexo.create({
      data: {
        recadoId: recado.id,
        nome: file.name,
        tipo: file.type || "application/octet-stream",
        tamanho: file.size,
        dados: buffer.toString("base64"),
      },
    });
  }

  revalidatePath("/mural");
}

export async function togglePinRecado(recadoId: string) {
  const user = await requireUser();
  const recado = await prisma.recado.findUnique({ where: { id: recadoId } });
  if (!recado) return;
  if (!user.isAdmin && recado.authorId !== user.id) throw new Error("Você não pode fixar este recado.");

  await prisma.recado.update({ where: { id: recadoId }, data: { pinned: !recado.pinned } });
  revalidatePath("/mural");
}

export async function deleteRecado(recadoId: string) {
  const user = await requireUser();
  const recado = await prisma.recado.findUnique({ where: { id: recadoId } });
  if (!recado) return;
  if (!user.isAdmin && recado.authorId !== user.id) throw new Error("Você não pode excluir este recado.");

  await prisma.recado.delete({ where: { id: recadoId } });
  revalidatePath("/mural");
}

export async function reactToRecado(recadoId: string, tipo: ReacaoTipo) {
  const user = await requireUser();
  const existente = await prisma.recadoReacao.findUnique({
    where: { recadoId_userId: { recadoId, userId: user.id } },
  });

  if (existente && existente.tipo === tipo) {
    await prisma.recadoReacao.delete({ where: { id: existente.id } });
  } else {
    await prisma.recadoReacao.upsert({
      where: { recadoId_userId: { recadoId, userId: user.id } },
      create: { recadoId, userId: user.id, tipo },
      update: { tipo },
    });
  }
  revalidatePath("/mural");
}

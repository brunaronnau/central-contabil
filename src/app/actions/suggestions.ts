"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { SuggestionStatus } from "@/generated/prisma/enums";

export async function createSuggestion(formData: FormData) {
  const user = await requireUser();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  await prisma.suggestion.create({
    data: { text, authorId: user.id },
  });

  revalidatePath("/sugestoes");
}

export async function voteSuggestion(suggestionId: string, value: 1 | -1) {
  const user = await requireUser();

  const existing = await prisma.suggestionVote.findUnique({
    where: { suggestionId_userId: { suggestionId, userId: user.id } },
  });

  if (existing && existing.value === value) {
    await prisma.suggestionVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.suggestionVote.upsert({
      where: { suggestionId_userId: { suggestionId, userId: user.id } },
      create: { suggestionId, userId: user.id, value },
      update: { value },
    });
  }

  revalidatePath("/sugestoes");
}

export async function setSuggestionStatus(suggestionId: string, status: SuggestionStatus) {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("Somente administradores podem marcar o status da sugestão.");

  const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) return;

  const nextStatus = suggestion.status === status ? "PENDENTE" : status;
  await prisma.suggestion.update({ where: { id: suggestionId }, data: { status: nextStatus } });

  revalidatePath("/sugestoes");
}

export async function deleteSuggestion(suggestionId: string) {
  const user = await requireUser();
  const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) return;

  if (!user.isAdmin && suggestion.authorId !== user.id) {
    throw new Error("Você não pode excluir esta sugestão.");
  }

  await prisma.suggestion.delete({ where: { id: suggestionId } });
  revalidatePath("/sugestoes");
}

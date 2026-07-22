"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { signOutAction } from "@/app/actions/auth-signout";

export async function toggleAdmin(userId: string) {
  const me = await requireUser();
  if (!me.isAdmin) throw new Error("Somente administradores podem alterar acessos.");
  if (userId === me.id) throw new Error("Você não pode alterar seu próprio nível de acesso.");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  await prisma.user.update({ where: { id: userId }, data: { isAdmin: !target.isAdmin } });
  revalidatePath("/usuarios");
}

export async function deleteUser(userId: string) {
  const me = await requireUser();
  if (!me.isAdmin) throw new Error("Somente administradores podem remover acessos.");

  await prisma.user.delete({ where: { id: userId } });

  if (userId === me.id) {
    await signOutAction();
    return;
  }

  revalidatePath("/usuarios");
  revalidatePath("/aniversariantes");
}

export async function updateMyPhoto(photo: string) {
  const me = await requireUser();
  await prisma.user.update({ where: { id: me.id }, data: { photo } });
  revalidatePath("/usuarios");
  revalidatePath("/aniversariantes");
  revalidatePath("/sugestoes");
  revalidatePath("/");
}

export async function updateMyName(formData: FormData) {
  const me = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.user.update({ where: { id: me.id }, data: { name } });
  revalidatePath("/usuarios");
  revalidatePath("/aniversariantes");
  revalidatePath("/sugestoes");
  redirect("/usuarios");
}

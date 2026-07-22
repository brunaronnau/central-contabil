import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // A sessão (JWT) sobrevive à exclusão do usuário no banco; confirmamos que
  // a conta ainda existe para que remover acesso em Usuários tenha efeito imediato.
  const stillExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!stillExists) redirect("/login");

  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

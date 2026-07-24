import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // A sessão (JWT) sobrevive à exclusão do usuário no banco e também não se
  // atualiza sozinha quando o isAdmin muda (o token só grava isso no login) —
  // por isso confirmamos aqui que a conta ainda existe e buscamos o isAdmin
  // atual, pra "remover acesso" e "tornar admin" em Usuários terem efeito
  // imediato, sem precisar a pessoa deslogar e logar de novo.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!dbUser) redirect("/login");

  return { ...session.user, isAdmin: dbUser.isAdmin };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

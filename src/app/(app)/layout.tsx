import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { checkAniversariosHoje } from "@/lib/aniversarios-notify";
import { checkFeriasProximas } from "@/lib/ferias-notify";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, photo: true, isAdmin: true },
  });
  await checkAniversariosHoje();
  await checkFeriasProximas();

  return (
    <AppShell
      user={{
        name: dbUser?.name ?? sessionUser.name ?? "",
        email: dbUser?.email ?? sessionUser.email ?? "",
        photo: dbUser?.photo ?? null,
        isAdmin: dbUser?.isAdmin ?? sessionUser.isAdmin ?? false,
      }}
    >
      {children}
    </AppShell>
  );
}

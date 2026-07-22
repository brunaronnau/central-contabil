import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, photo: true },
  });

  return (
    <AppShell
      user={{
        name: dbUser?.name ?? sessionUser.name ?? "",
        email: dbUser?.email ?? sessionUser.email ?? "",
        photo: dbUser?.photo ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}

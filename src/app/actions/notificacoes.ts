"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const LIMITE_PAINEL = 30;

export type NotificacaoItem = {
  id: string;
  kind: string;
  titulo: string;
  sub: string | null;
  href: string | null;
  createdAt: number;
};

export async function listNotificacoes(): Promise<{ itens: NotificacaoItem[]; temNaoLida: boolean; lastSeenAt: number }> {
  const me = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: me.id }, select: { notifLastSeenAt: true } });
  const lastSeen = user?.notifLastSeenAt ?? new Date(0);

  const notificacoes = await prisma.notificacao.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMITE_PAINEL,
  });

  return {
    itens: notificacoes.map((n) => ({
      id: n.id,
      kind: n.kind,
      titulo: n.titulo,
      sub: n.sub,
      href: n.href,
      createdAt: n.createdAt.getTime(),
    })),
    temNaoLida: notificacoes.some((n) => n.createdAt > lastSeen),
    lastSeenAt: lastSeen.getTime(),
  };
}

export async function marcarNotificacoesVistas() {
  const me = await requireUser();
  await prisma.user.update({ where: { id: me.id }, data: { notifLastSeenAt: new Date() } });
}

export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const me = await requireUser();
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userId: me.id },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, userId: me.id },
  });
}

export async function removePushSubscription(endpoint: string) {
  await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

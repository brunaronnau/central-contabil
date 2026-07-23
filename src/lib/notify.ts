import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function getVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || "mailto:contato@navecon.net.br" };
}

let vapidConfigured = false;
function configureWebPush(): boolean {
  const keys = getVapidKeys();
  if (!keys) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    vapidConfigured = true;
  }
  return true;
}

export type NotifyInput = {
  kind: string;
  titulo: string;
  sub?: string;
  href?: string;
  /** Não notifica push para quem disparou a própria ação. */
  excludeUserId?: string;
};

/**
 * Registra uma notificação na central do site (sino) e, se houver alguma
 * inscrição de push do navegador salva, também dispara a notificação nativa
 * do sistema operacional. Falha de push nunca derruba a ação que chamou —
 * o pior caso é a notificação não aparecer.
 */
export async function notify({ kind, titulo, sub, href, excludeUserId }: NotifyInput) {
  await prisma.notificacao.create({ data: { kind, titulo, sub, href } });

  if (!configureWebPush()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: excludeUserId ? { userId: { not: excludeUserId } } : undefined,
  });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title: titulo, body: sub ?? "", href: href ?? "/" });

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      } catch (err) {
        // 404/410 = inscrição expirada ou revogada pelo navegador — não adianta tentar de novo.
        const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );
}

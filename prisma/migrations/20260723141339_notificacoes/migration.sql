-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifLastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "votacoes" ADD COLUMN     "notificouEncerramento" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "sub" TEXT,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aniversarios_notificados" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "aniversarios_notificados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacoes_createdAt_idx" ON "notificacoes"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "aniversarios_notificados_userId_ano_key" ON "aniversarios_notificados"("userId", "ano");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aniversarios_notificados" ADD CONSTRAINT "aniversarios_notificados_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

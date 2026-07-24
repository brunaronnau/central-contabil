-- AlterTable
ALTER TABLE "lideranca_ferias" ADD COLUMN     "emailLembrete7diasEm" TIMESTAMP(3),
ADD COLUMN     "emailLembreteDiaEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "aniversario_email_enviado" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "aniversario_email_enviado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorio_mensal_enviado" (
    "id" TEXT NOT NULL,
    "anoMes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relatorio_mensal_enviado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aniversario_email_enviado_userId_ano_tipo_key" ON "aniversario_email_enviado"("userId", "ano", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "relatorio_mensal_enviado_anoMes_key" ON "relatorio_mensal_enviado"("anoMes");

-- AddForeignKey
ALTER TABLE "aniversario_email_enviado" ADD CONSTRAINT "aniversario_email_enviado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

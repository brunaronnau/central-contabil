-- CreateEnum
CREATE TYPE "LiderancaNotaTipo" AS ENUM ('OBSERVACAO', 'META');

-- CreateEnum
CREATE TYPE "LiderancaNotaStatus" AS ENUM ('ABERTA', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "apenasAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "lideranca_notas" (
    "id" TEXT NOT NULL,
    "tipo" "LiderancaNotaTipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "status" "LiderancaNotaStatus" NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,

    CONSTRAINT "lideranca_notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lideranca_eventos" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,

    CONSTRAINT "lideranca_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lideranca_ferias" (
    "id" TEXT NOT NULL,
    "colaborador" TEXT NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "observacao" TEXT,
    "lembreteEnviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,

    CONSTRAINT "lideranca_ferias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lideranca_eventos_data_idx" ON "lideranca_eventos"("data");

-- CreateIndex
CREATE INDEX "lideranca_ferias_dataInicio_idx" ON "lideranca_ferias"("dataInicio");

-- AddForeignKey
ALTER TABLE "lideranca_notas" ADD CONSTRAINT "lideranca_notas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lideranca_eventos" ADD CONSTRAINT "lideranca_eventos_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lideranca_ferias" ADD CONSTRAINT "lideranca_ferias_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ReacaoTipo" AS ENUM ('LIKE', 'HEART', 'DISLIKE');

-- CreateEnum
CREATE TYPE "MetaStatus" AS ENUM ('ABERTA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "MetaNotaTipo" AS ENUM ('NOTA', 'CONCLUSAO', 'ALERTA');

-- CreateTable
CREATE TABLE "recados" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "recados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recado_anexos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "dados" TEXT NOT NULL,
    "recadoId" TEXT NOT NULL,

    CONSTRAINT "recado_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recado_reacoes" (
    "id" TEXT NOT NULL,
    "tipo" "ReacaoTipo" NOT NULL,
    "recadoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "recado_reacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votacoes" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerraEm" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "votacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votacao_opcoes" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "votacaoId" TEXT NOT NULL,

    CONSTRAINT "votacao_opcoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votacao_votos" (
    "id" TEXT NOT NULL,
    "votacaoId" TEXT NOT NULL,
    "opcaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "votacao_votos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE NOT NULL,
    "reward" TEXT,
    "status" "MetaStatus" NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_notas" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tipo" "MetaNotaTipo" NOT NULL DEFAULT 'NOTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "meta_notas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recado_reacoes_recadoId_userId_key" ON "recado_reacoes"("recadoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "votacao_votos_votacaoId_userId_key" ON "votacao_votos"("votacaoId", "userId");

-- AddForeignKey
ALTER TABLE "recados" ADD CONSTRAINT "recados_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recado_anexos" ADD CONSTRAINT "recado_anexos_recadoId_fkey" FOREIGN KEY ("recadoId") REFERENCES "recados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recado_reacoes" ADD CONSTRAINT "recado_reacoes_recadoId_fkey" FOREIGN KEY ("recadoId") REFERENCES "recados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recado_reacoes" ADD CONSTRAINT "recado_reacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votacoes" ADD CONSTRAINT "votacoes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votacao_opcoes" ADD CONSTRAINT "votacao_opcoes_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "votacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votacao_votos" ADD CONSTRAINT "votacao_votos_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "votacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votacao_votos" ADD CONSTRAINT "votacao_votos_opcaoId_fkey" FOREIGN KEY ("opcaoId") REFERENCES "votacao_opcoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votacao_votos" ADD CONSTRAINT "votacao_votos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_notas" ADD CONSTRAINT "meta_notas_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "metas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_notas" ADD CONSTRAINT "meta_notas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

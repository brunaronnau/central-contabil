-- DropForeignKey
ALTER TABLE "meta_notas" DROP CONSTRAINT "meta_notas_authorId_fkey";

-- DropForeignKey
ALTER TABLE "metas" DROP CONSTRAINT "metas_authorId_fkey";

-- DropForeignKey
ALTER TABLE "recado_reacoes" DROP CONSTRAINT "recado_reacoes_userId_fkey";

-- DropForeignKey
ALTER TABLE "recados" DROP CONSTRAINT "recados_authorId_fkey";

-- DropForeignKey
ALTER TABLE "votacao_votos" DROP CONSTRAINT "votacao_votos_userId_fkey";

-- DropForeignKey
ALTER TABLE "votacoes" DROP CONSTRAINT "votacoes_authorId_fkey";

-- AlterTable
ALTER TABLE "meta_notas" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "metas" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "recado_reacoes" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "recados" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "votacao_votos" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "votacoes" ALTER COLUMN "authorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "recados" ADD CONSTRAINT "recados_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recado_reacoes" ADD CONSTRAINT "recado_reacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votacoes" ADD CONSTRAINT "votacoes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votacao_votos" ADD CONSTRAINT "votacao_votos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_notas" ADD CONSTRAINT "meta_notas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

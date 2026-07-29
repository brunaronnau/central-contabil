-- CreateEnum
CREATE TYPE "FichaLocalDocumentos" AS ENUM ('AC_DOCS', 'NEXTCLOUD', 'CAPSULA', 'OUTRO');

-- CreateTable
CREATE TABLE "ficha_grupos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataEntrada" DATE,
    "dataSaida" DATE,
    "contabilidadeAnteriorNome" TEXT,
    "contabilidadeAnteriorCelular" TEXT,
    "contabilidadeAnteriorEmail" TEXT,
    "contabilidadeNovaNome" TEXT,
    "contabilidadeNovaCelular" TEXT,
    "contabilidadeNovaEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ficha_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL DEFAULT '',
    "localDocumentos" "FichaLocalDocumentos" NOT NULL DEFAULT 'AC_DOCS',
    "localDocumentosOutro" TEXT,
    "semMovimentacao" BOOLEAN NOT NULL DEFAULT false,
    "semMovimentacaoConfirmadoEm" DATE,
    "contatoNome" TEXT,
    "contatoTelefone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "grupoId" TEXT NOT NULL,

    CONSTRAINT "ficha_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_tributacao_historico" (
    "id" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "ficha_tributacao_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_analista_historico" (
    "id" TEXT NOT NULL,
    "nomeAnalista" TEXT NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "ficha_analista_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_anexos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "dados" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "ficha_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_observacoes" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "ficha_observacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ficha_empresas" ADD CONSTRAINT "ficha_empresas_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "ficha_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tributacao_historico" ADD CONSTRAINT "ficha_tributacao_historico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "ficha_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_analista_historico" ADD CONSTRAINT "ficha_analista_historico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "ficha_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_anexos" ADD CONSTRAINT "ficha_anexos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "ficha_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_anexos" ADD CONSTRAINT "ficha_anexos_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_observacoes" ADD CONSTRAINT "ficha_observacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "ficha_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_observacoes" ADD CONSTRAINT "ficha_observacoes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

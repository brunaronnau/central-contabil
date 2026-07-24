-- CreateTable
CREATE TABLE "tributaria_grupos" (
    "id" TEXT NOT NULL,
    "grupoNome" TEXT NOT NULL,
    "grupoResponsavel" TEXT NOT NULL DEFAULT '',
    "grupoData" TEXT NOT NULL DEFAULT '',
    "anoSelecionado" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tributaria_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tributaria_empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL DEFAULT '',
    "atividade" TEXT NOT NULL,
    "regimeAtual" TEXT NOT NULL,
    "prejuizoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grupoId" TEXT NOT NULL,

    CONSTRAINT "tributaria_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tributaria_dados_mensais" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "dados" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "tributaria_dados_mensais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tributaria_dados_mensais_empresaId_ano_key" ON "tributaria_dados_mensais"("empresaId", "ano");

-- AddForeignKey
ALTER TABLE "tributaria_empresas" ADD CONSTRAINT "tributaria_empresas_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "tributaria_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tributaria_dados_mensais" ADD CONSTRAINT "tributaria_dados_mensais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "tributaria_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

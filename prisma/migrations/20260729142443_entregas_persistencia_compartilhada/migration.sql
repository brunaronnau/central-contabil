-- CreateTable
CREATE TABLE "entrega_uploads" (
    "id" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,

    CONSTRAINT "entrega_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega_linhas" (
    "id" TEXT NOT NULL,
    "obrigacao" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "empid" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "respPrazo" TEXT NOT NULL,
    "respEntrega" TEXT NOT NULL,
    "dataEntrega" TEXT NOT NULL,
    "prazoLegal" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,

    CONSTRAINT "entrega_linhas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entrega_linhas_uploadId_idx" ON "entrega_linhas"("uploadId");

-- AddForeignKey
ALTER TABLE "entrega_uploads" ADD CONSTRAINT "entrega_uploads_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_linhas" ADD CONSTRAINT "entrega_linhas_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "entrega_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

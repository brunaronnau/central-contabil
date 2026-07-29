"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { EntregaRow } from "@/lib/entregas";

export type EntregasSalvas = {
  arquivo: string;
  autor: string;
  atualizadoEm: string;
  linhas: EntregaRow[];
};

export async function carregarEntregasSalvas(): Promise<EntregasSalvas | null> {
  await requireUser();
  const upload = await prisma.entregaUpload.findFirst({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } }, linhas: true },
  });
  if (!upload) return null;

  return {
    arquivo: upload.arquivo,
    autor: upload.author?.name ?? "Usuário removido",
    atualizadoEm: upload.createdAt.toISOString(),
    linhas: upload.linhas.map((l) => ({
      obrigacao: l.obrigacao,
      empresa: l.empresa,
      empid: l.empid,
      departamento: l.departamento,
      respprazo: l.respPrazo,
      respentrega: l.respEntrega,
      dataentrega: l.dataEntrega,
      prazolegal: l.prazoLegal,
      competencia: l.competencia,
      status: l.status,
      classe: l.classe as EntregaRow["classe"],
    })),
  };
}

// O relatório é um retrato do momento — cada novo upload substitui o
// anterior por inteiro, pra todo mundo ver sempre o mais recente.
export async function salvarEntregas(arquivo: string, linhas: EntregaRow[]) {
  const user = await requireUser();

  await prisma.$transaction([
    prisma.entregaUpload.deleteMany({}),
    prisma.entregaUpload.create({
      data: {
        arquivo,
        authorId: user.id,
        linhas: {
          createMany: {
            data: linhas.map((l) => ({
              obrigacao: l.obrigacao,
              empresa: l.empresa,
              empid: l.empid,
              departamento: l.departamento,
              respPrazo: l.respprazo,
              respEntrega: l.respentrega,
              dataEntrega: l.dataentrega,
              prazoLegal: l.prazolegal,
              competencia: l.competencia,
              status: l.status,
              classe: l.classe,
            })),
          },
        },
      },
    }),
  ]);

  revalidatePath("/entregas");
}

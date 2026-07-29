"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import type { Atividade, Empresa, Grupo, MesesDados, RegimeAtual } from "@/lib/tributaria";
import type { Prisma } from "@/generated/prisma/client";

type GrupoComRelacoes = Prisma.TributariaGrupoGetPayload<{
  include: { empresas: { include: { dadosMensais: true } } };
}>;

function paraGrupo(g: GrupoComRelacoes): Grupo {
  return {
    id: g.id,
    grupoNome: g.grupoNome,
    grupoResponsavel: g.grupoResponsavel,
    grupoData: g.grupoData,
    anoSelecionado: g.anoSelecionado,
    empresas: g.empresas.map(
      (e): Empresa => ({
        id: e.id,
        nome: e.nome,
        cnpj: e.cnpj,
        atividade: e.atividade as Atividade,
        regimeAtual: e.regimeAtual as RegimeAtual,
        prejuizoInicial: e.prejuizoInicial,
        anos: Object.fromEntries(e.dadosMensais.map((d) => [d.ano, d.dados as unknown as MesesDados])),
      }),
    ),
  };
}

export async function listarGrupos(): Promise<Grupo[]> {
  await requireUser();
  const grupos = await prisma.tributariaGrupo.findMany({
    orderBy: { createdAt: "asc" },
    include: { empresas: { include: { dadosMensais: true } } },
  });
  return grupos.map(paraGrupo);
}

export async function excluirGrupoTributaria(id: string): Promise<void> {
  await requireAdmin();
  await prisma.tributariaGrupo.delete({ where: { id } });
}

export async function salvarGrupoCompleto(grupo: Grupo): Promise<void> {
  await requireUser();

  await prisma.$transaction(async (tx) => {
    await tx.tributariaGrupo.upsert({
      where: { id: grupo.id },
      create: {
        id: grupo.id,
        grupoNome: grupo.grupoNome,
        grupoResponsavel: grupo.grupoResponsavel,
        grupoData: grupo.grupoData,
        anoSelecionado: grupo.anoSelecionado,
      },
      update: {
        grupoNome: grupo.grupoNome,
        grupoResponsavel: grupo.grupoResponsavel,
        grupoData: grupo.grupoData,
        anoSelecionado: grupo.anoSelecionado,
      },
    });

    const existentes = await tx.tributariaEmpresa.findMany({ where: { grupoId: grupo.id }, select: { id: true } });
    const idsAtuais = new Set(grupo.empresas.map((e) => e.id));
    const idsParaRemover = existentes.map((e) => e.id).filter((id) => !idsAtuais.has(id));
    if (idsParaRemover.length > 0) {
      await tx.tributariaEmpresa.deleteMany({ where: { id: { in: idsParaRemover } } });
    }

    for (const empresa of grupo.empresas) {
      await tx.tributariaEmpresa.upsert({
        where: { id: empresa.id },
        create: {
          id: empresa.id,
          grupoId: grupo.id,
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          atividade: empresa.atividade,
          regimeAtual: empresa.regimeAtual,
          prejuizoInicial: empresa.prejuizoInicial,
        },
        update: {
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          atividade: empresa.atividade,
          regimeAtual: empresa.regimeAtual,
          prejuizoInicial: empresa.prejuizoInicial,
        },
      });

      for (const [anoStr, dados] of Object.entries(empresa.anos)) {
        await tx.tributariaDadosMensais.upsert({
          where: { empresaId_ano: { empresaId: empresa.id, ano: Number(anoStr) } },
          create: { empresaId: empresa.id, ano: Number(anoStr), dados: dados as unknown as Prisma.InputJsonValue },
          update: { dados: dados as unknown as Prisma.InputJsonValue },
        });
      }
    }
  });
}

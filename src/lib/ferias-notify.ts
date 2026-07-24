import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

const DIAS_ANTECEDENCIA = 3;

function fmtDataBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/**
 * Mesmo espírito de checkAniversariosHoje() — roda a cada carregamento de
 * página (ver (app)/layout.tsx), sem depender de um processo em segundo
 * plano. Como o período de férias já existe como registro (diferente do
 * aniversário, que se repete todo ano na mesma data), a idempotência aqui é
 * um campo `lembrateEnviadoEm` na própria linha em vez de uma tabela de
 * controle: o UPDATE condicional (WHERE lembreteEnviadoEm IS NULL) garante
 * que só uma requisição consegue "vencer a corrida" e disparar o aviso,
 * mesmo com vários admins navegando ao mesmo tempo.
 */
export async function checkFeriasProximas() {
  const hoje = new Date();
  const alvo = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + DIAS_ANTECEDENCIA));
  const proximoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), alvo.getUTCDate() + 1));

  const candidatas = await prisma.liderancaFerias.findMany({
    where: { lembreteEnviadoEm: null, dataInicio: { gte: alvo, lt: proximoDia } },
  });
  if (candidatas.length === 0) return;

  for (const f of candidatas) {
    const resultado = await prisma.liderancaFerias.updateMany({
      where: { id: f.id, lembreteEnviadoEm: null },
      data: { lembreteEnviadoEm: new Date() },
    });
    if (resultado.count === 0) continue; // outra requisição concorrente já disparou esse aviso

    await notify({
      kind: "ferias",
      titulo: `${f.colaborador} entra de férias em ${DIAS_ANTECEDENCIA} dias`,
      sub: `De ${fmtDataBR(f.dataInicio)} até ${fmtDataBR(f.dataFim)}`,
      href: "/lideranca",
      apenasAdmin: true,
    });
  }
}

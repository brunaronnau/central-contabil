import { prisma } from "@/lib/prisma";
import { emailConfigurado, enviarEmail } from "@/lib/mailer";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIA_RELATORIO_MENSAL = 28;
const DIAS_ANTECEDENCIA_LEMBRETE = 7;

function fmtDataBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function inicioDoDiaUTC(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } });
  return admins.map((a) => a.email);
}

async function enviarParaAdmins(admins: string[], subject: string, html: string) {
  for (const email of admins) {
    await enviarEmail({ to: email, subject, html }).catch((err) => {
      console.error(`Falha ao enviar e-mail "${subject}" para ${email}:`, err);
    });
  }
}

/**
 * Todo dia 28, manda pros admins um resumo de férias programadas e
 * aniversariantes do mês SEGUINTE. RelatorioMensalEnviado (chave única por
 * "ano-mês") garante que só sai uma vez, mesmo se o processo reiniciar ou o
 * cron rodar de novo no mesmo dia.
 */
export async function checarRelatorioMensal(admins: string[], hoje: Date) {
  if (hoje.getUTCDate() !== DIA_RELATORIO_MENSAL) return;

  const anoMes = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;
  try {
    await prisma.relatorioMensalEnviado.create({ data: { anoMes } });
  } catch {
    return; // já enviado nesse mês (violação do @@unique)
  }

  const proximoMes = (hoje.getUTCMonth() + 1) % 12;
  const anoProximoMes = hoje.getUTCMonth() === 11 ? hoje.getUTCFullYear() + 1 : hoje.getUTCFullYear();
  const inicioProximoMes = new Date(Date.UTC(anoProximoMes, proximoMes, 1));
  const inicioMesSeguinte = new Date(Date.UTC(anoProximoMes, proximoMes + 1, 1));

  const feriasProximoMes = await prisma.liderancaFerias.findMany({
    where: { dataInicio: { gte: inicioProximoMes, lt: inicioMesSeguinte } },
    orderBy: { dataInicio: "asc" },
  });

  const usuarios = await prisma.user.findMany({ where: { birthday: { not: null } }, select: { name: true, birthday: true } });
  const aniversariantes = usuarios
    .filter((u) => u.birthday!.getUTCMonth() === proximoMes)
    .sort((a, b) => a.birthday!.getUTCDate() - b.birthday!.getUTCDate());

  const nomeMes = MESES[proximoMes];
  const html = `
    <h2>Relatório mensal — ${nomeMes} de ${anoProximoMes}</h2>
    <h3>Férias programadas</h3>
    ${
      feriasProximoMes.length === 0
        ? "<p>Nenhuma férias programada para o mês.</p>"
        : `<ul>${feriasProximoMes
            .map((f) => `<li>${f.colaborador}: ${fmtDataBR(f.dataInicio)} até ${fmtDataBR(f.dataFim)}${f.observacao ? ` — ${f.observacao}` : ""}</li>`)
            .join("")}</ul>`
    }
    <h3>Aniversariantes</h3>
    ${
      aniversariantes.length === 0
        ? "<p>Nenhum aniversariante no mês.</p>"
        : `<ul>${aniversariantes
            .map((u) => `<li>${u.name}: ${String(u.birthday!.getUTCDate()).padStart(2, "0")}/${String(proximoMes + 1).padStart(2, "0")}</li>`)
            .join("")}</ul>`
    }
    <p style="color:#888;font-size:12px;">Enviado automaticamente todo dia ${DIA_RELATORIO_MENSAL} pela Central Contábil.</p>
  `;

  await enviarParaAdmins(admins, `Relatório mensal — Férias e Aniversários de ${nomeMes}`, html);
}

/**
 * Lembretes individuais de férias: 7 dias antes de começar e no próprio dia.
 * Cada período de férias tem seus próprios campos de controle — evita
 * duplicar o aviso mesmo com concorrência (UPDATE condicional).
 */
export async function checarLembretesFerias(admins: string[], hoje: Date) {
  const hojeTs = inicioDoDiaUTC(hoje);
  const em7DiasTs = hojeTs + DIAS_ANTECEDENCIA_LEMBRETE * 86400000;

  const candidatos7Dias = await prisma.liderancaFerias.findMany({
    where: { emailLembrete7diasEm: null, dataInicio: { gte: new Date(em7DiasTs), lt: new Date(em7DiasTs + 86400000) } },
  });
  for (const f of candidatos7Dias) {
    const r = await prisma.liderancaFerias.updateMany({ where: { id: f.id, emailLembrete7diasEm: null }, data: { emailLembrete7diasEm: new Date() } });
    if (r.count === 0) continue;
    await enviarParaAdmins(
      admins,
      `Férias chegando: ${f.colaborador} em ${DIAS_ANTECEDENCIA_LEMBRETE} dias`,
      `<p>${f.colaborador} entra de férias em ${DIAS_ANTECEDENCIA_LEMBRETE} dias — de ${fmtDataBR(f.dataInicio)} até ${fmtDataBR(f.dataFim)}.</p>`,
    );
  }

  const candidatosHoje = await prisma.liderancaFerias.findMany({
    where: { emailLembreteDiaEm: null, dataInicio: { gte: new Date(hojeTs), lt: new Date(hojeTs + 86400000) } },
  });
  for (const f of candidatosHoje) {
    const r = await prisma.liderancaFerias.updateMany({ where: { id: f.id, emailLembreteDiaEm: null }, data: { emailLembreteDiaEm: new Date() } });
    if (r.count === 0) continue;
    await enviarParaAdmins(
      admins,
      `Hoje: ${f.colaborador} entra de férias`,
      `<p>${f.colaborador} entra de férias hoje, até ${fmtDataBR(f.dataFim)}.</p>`,
    );
  }
}

/**
 * Lembretes individuais de aniversário: 7 dias antes e no próprio dia.
 * Diferente de férias, aniversário se repete todo ano na mesma data — por
 * isso o controle é por ano (AniversarioEmailEnviado), igual o padrão já
 * usado pro aviso no sino (AniversarioNotificado), só que aqui com dois
 * tipos ("7DIAS" e "DIA") em vez de um só.
 */
export async function checarLembretesAniversario(admins: string[], hoje: Date) {
  const ano = hoje.getUTCFullYear();
  const hojeMD = hoje.getUTCMonth() * 100 + hoje.getUTCDate();
  const em7Dias = new Date(inicioDoDiaUTC(hoje) + DIAS_ANTECEDENCIA_LEMBRETE * 86400000);
  const em7DiasMD = em7Dias.getUTCMonth() * 100 + em7Dias.getUTCDate();

  const usuarios = await prisma.user.findMany({ where: { birthday: { not: null } }, select: { id: true, name: true, birthday: true } });

  for (const u of usuarios) {
    const md = u.birthday!.getUTCMonth() * 100 + u.birthday!.getUTCDate();

    if (md === em7DiasMD) {
      try {
        await prisma.aniversarioEmailEnviado.create({ data: { userId: u.id, ano, tipo: "7DIAS" } });
        await enviarParaAdmins(
          admins,
          `Aniversário chegando: ${u.name} em ${DIAS_ANTECEDENCIA_LEMBRETE} dias`,
          `<p>${u.name} faz aniversário em ${DIAS_ANTECEDENCIA_LEMBRETE} dias.</p>`,
        );
      } catch {
        // já enviado esse ano (violação do @@unique)
      }
    }

    if (md === hojeMD) {
      try {
        await prisma.aniversarioEmailEnviado.create({ data: { userId: u.id, ano, tipo: "DIA" } });
        await enviarParaAdmins(admins, `Hoje é aniversário de ${u.name}!`, `<p>Hoje é aniversário de ${u.name}.</p>`);
      } catch {
        // já enviado esse ano (violação do @@unique)
      }
    }
  }
}

/**
 * Ponto de entrada chamado 1x por dia pelo agendador (ver instrumentation.ts).
 * Cada checagem é independente e idempotente — uma falhar não impede as outras.
 */
export async function rodarChecagensDiarias() {
  if (!emailConfigurado()) return;

  const admins = await getAdminEmails();
  if (admins.length === 0) return;

  const hoje = new Date();

  await checarRelatorioMensal(admins, hoje).catch((err) => console.error("Erro no relatório mensal:", err));
  await checarLembretesFerias(admins, hoje).catch((err) => console.error("Erro nos lembretes de férias:", err));
  await checarLembretesAniversario(admins, hoje).catch((err) => console.error("Erro nos lembretes de aniversário:", err));
}

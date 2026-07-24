"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { notify } from "@/lib/notify";

function fmtDataBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/* ==================== Notas & Metas ==================== */

export async function criarNota(formData: FormData) {
  const me = await requireAdmin();
  const tipo = formData.get("tipo") === "META" ? "META" : "OBSERVACAO";
  const titulo = String(formData.get("titulo") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!titulo || !texto) return;

  await prisma.liderancaNota.create({ data: { tipo, titulo, texto, authorId: me.id } });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Nova ${tipo === "META" ? "meta" : "observação"}: ${titulo}`,
    sub: `Registrada por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

export async function alternarStatusNota(id: string) {
  const me = await requireAdmin();
  const nota = await prisma.liderancaNota.findUnique({ where: { id }, select: { status: true, titulo: true } });
  if (!nota) return;
  const novoStatus = nota.status === "CONCLUIDA" ? "ABERTA" : "CONCLUIDA";
  await prisma.liderancaNota.update({ where: { id }, data: { status: novoStatus } });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Meta ${novoStatus === "CONCLUIDA" ? "concluída" : "reaberta"}: ${nota.titulo}`,
    sub: `Por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

export async function excluirNota(id: string) {
  const me = await requireAdmin();
  const nota = await prisma.liderancaNota.delete({ where: { id } });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Registro removido: ${nota.titulo}`,
    sub: `Por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

/* ==================== Calendário do time ==================== */

export async function criarEvento(formData: FormData) {
  const me = await requireAdmin();
  const dataStr = String(formData.get("data") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!dataStr || !titulo) return;

  await prisma.liderancaEvento.create({
    data: { data: new Date(dataStr), titulo, descricao: descricao || null, authorId: me.id },
  });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Nova observação no calendário: ${titulo}`,
    sub: `Registrada por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

export async function excluirEvento(id: string) {
  const me = await requireAdmin();
  const evento = await prisma.liderancaEvento.delete({ where: { id } });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Observação removida do calendário: ${evento.titulo}`,
    sub: `Por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

/* ==================== Controle de férias ==================== */

export async function criarFerias(formData: FormData) {
  const me = await requireAdmin();
  const colaborador = String(formData.get("colaborador") ?? "").trim();
  const dataInicioStr = String(formData.get("dataInicio") ?? "");
  const dataFimStr = String(formData.get("dataFim") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();
  if (!colaborador || !dataInicioStr || !dataFimStr) return;

  const ferias = await prisma.liderancaFerias.create({
    data: {
      colaborador,
      dataInicio: new Date(dataInicioStr),
      dataFim: new Date(dataFimStr),
      observacao: observacao || null,
      authorId: me.id,
    },
  });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Férias programadas: ${colaborador}`,
    sub: `${fmtDataBR(ferias.dataInicio)} até ${fmtDataBR(ferias.dataFim)} · registrado por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

export async function editarFerias(id: string, formData: FormData) {
  const me = await requireAdmin();
  const colaborador = String(formData.get("colaborador") ?? "").trim();
  const dataInicioStr = String(formData.get("dataInicio") ?? "");
  const dataFimStr = String(formData.get("dataFim") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();
  if (!colaborador || !dataInicioStr || !dataFimStr) return;

  const ferias = await prisma.liderancaFerias.update({
    where: { id },
    data: {
      colaborador,
      dataInicio: new Date(dataInicioStr),
      dataFim: new Date(dataFimStr),
      observacao: observacao || null,
      // Datas podem ter mudado — libera o lembrete de "férias chegando" pra
      // ser reavaliado contra o novo período, em vez de ficar preso ao aviso
      // que já tinha (ou não) disparado pro período antigo.
      lembreteEnviadoEm: null,
    },
  });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Férias atualizadas: ${colaborador}`,
    sub: `${fmtDataBR(ferias.dataInicio)} até ${fmtDataBR(ferias.dataFim)} · alterado por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

export async function excluirFerias(id: string) {
  const me = await requireAdmin();
  const ferias = await prisma.liderancaFerias.delete({ where: { id } });
  revalidatePath("/lideranca");
  await notify({
    kind: "lideranca",
    titulo: `Férias removidas: ${ferias.colaborador}`,
    sub: `Por ${me.name}`,
    href: "/lideranca",
    apenasAdmin: true,
    excludeUserId: me.id,
  });
}

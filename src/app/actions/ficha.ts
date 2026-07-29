"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/session";
import type { FichaLocalDocumentos } from "@/generated/prisma/enums";

const PATH = "/ficha-empresas";
const ANEXO_MAX_BYTES = 5 * 1024 * 1024;

function dataOuNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? new Date(s) : null;
}

function diaAnterior(d: Date) {
  return new Date(d.getTime() - 86400000);
}

/* ==================== Grupo ==================== */

export async function criarGrupo(formData: FormData) {
  await requireUser();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const grupo = await prisma.fichaGrupo.create({ data: { nome } });
  revalidatePath(PATH);
  redirect(`${PATH}?tab=setup&grupo=${grupo.id}`);
}

export async function salvarGrupo(id: string, formData: FormData) {
  await requireUser();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await prisma.fichaGrupo.update({
    where: { id },
    data: {
      nome,
      dataEntrada: dataOuNull(formData.get("dataEntrada")),
      dataSaida: dataOuNull(formData.get("dataSaida")),
      contabilidadeAnteriorNome: String(formData.get("contabilidadeAnteriorNome") ?? "").trim() || null,
      contabilidadeAnteriorCelular: String(formData.get("contabilidadeAnteriorCelular") ?? "").trim() || null,
      contabilidadeAnteriorEmail: String(formData.get("contabilidadeAnteriorEmail") ?? "").trim() || null,
      contabilidadeNovaNome: String(formData.get("contabilidadeNovaNome") ?? "").trim() || null,
      contabilidadeNovaCelular: String(formData.get("contabilidadeNovaCelular") ?? "").trim() || null,
      contabilidadeNovaEmail: String(formData.get("contabilidadeNovaEmail") ?? "").trim() || null,
    },
  });
  revalidatePath(PATH);
}

export async function excluirGrupo(id: string) {
  await requireAdmin();
  await prisma.fichaGrupo.delete({ where: { id } });
  revalidatePath(PATH);
  redirect(PATH);
}

/* ==================== Empresa ==================== */

export async function criarEmpresa(grupoId: string, formData: FormData) {
  await requireUser();
  const nome = String(formData.get("nome") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  if (!nome) return;
  await prisma.fichaEmpresa.create({ data: { grupoId, nome, cnpj } });
  revalidatePath(PATH);
}

export async function salvarEmpresaCampos(id: string, formData: FormData) {
  await requireUser();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;
  const localDocumentos = String(formData.get("localDocumentos") ?? "AC_DOCS") as FichaLocalDocumentos;
  const semMovimentacao = formData.get("semMovimentacao") === "on";

  await prisma.fichaEmpresa.update({
    where: { id },
    data: {
      nome,
      cnpj: String(formData.get("cnpj") ?? "").trim(),
      localDocumentos,
      localDocumentosOutro: localDocumentos === "OUTRO" ? String(formData.get("localDocumentosOutro") ?? "").trim() || null : null,
      contatoNome: String(formData.get("contatoNome") ?? "").trim() || null,
      contatoTelefone: String(formData.get("contatoTelefone") ?? "").trim() || null,
      semMovimentacao,
      semMovimentacaoConfirmadoEm: semMovimentacao ? dataOuNull(formData.get("semMovimentacaoConfirmadoEm")) : null,
    },
  });
  revalidatePath(PATH);
}

export async function excluirEmpresa(id: string) {
  await requireAdmin();
  await prisma.fichaEmpresa.delete({ where: { id } });
  revalidatePath(PATH);
}

/* ==================== Histórico de tributação ==================== */

export async function adicionarTributacao(empresaId: string, formData: FormData) {
  await requireUser();
  const regime = String(formData.get("regime") ?? "").trim();
  const dataInicio = dataOuNull(formData.get("dataInicio"));
  const dataFim = dataOuNull(formData.get("dataFim"));
  if (!regime || !dataInicio) return;

  // Só fecha automaticamente o registro "vigente" anterior quando o novo já
  // nasce sem data-fim (ou seja, é o novo regime atual) — se quem preencheu
  // já informou a própria data-fim (registro histórico avulso), não mexe em
  // mais nada.
  if (!dataFim) {
    const atual = await prisma.fichaTributacaoHistorico.findFirst({ where: { empresaId, dataFim: null } });
    if (atual) {
      await prisma.fichaTributacaoHistorico.update({ where: { id: atual.id }, data: { dataFim: diaAnterior(dataInicio) } });
    }
  }
  await prisma.fichaTributacaoHistorico.create({ data: { empresaId, regime, dataInicio, dataFim } });
  revalidatePath(PATH);
}

/* ==================== Histórico de analista responsável ==================== */

export async function adicionarAnalista(empresaId: string, formData: FormData) {
  await requireUser();
  const nomeAnalista = String(formData.get("nomeAnalista") ?? "").trim();
  const dataInicio = dataOuNull(formData.get("dataInicio"));
  const dataFim = dataOuNull(formData.get("dataFim"));
  if (!nomeAnalista || !dataInicio) return;

  if (!dataFim) {
    const atual = await prisma.fichaAnalistaHistorico.findFirst({ where: { empresaId, dataFim: null } });
    if (atual) {
      await prisma.fichaAnalistaHistorico.update({ where: { id: atual.id }, data: { dataFim: diaAnterior(dataInicio) } });
    }
  }
  await prisma.fichaAnalistaHistorico.create({ data: { empresaId, nomeAnalista, dataInicio, dataFim } });
  revalidatePath(PATH);
}

/* ==================== Anexos ==================== */

export async function adicionarAnexo(formData: FormData) {
  const user = await requireUser();
  const empresaId = String(formData.get("empresaId") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();
  const file = formData.get("arquivo");
  if (!empresaId || !(file instanceof File) || file.size === 0) return;
  if (file.size > ANEXO_MAX_BYTES) {
    throw new Error(`O arquivo "${file.name}" excede o limite de 5MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await prisma.fichaAnexo.create({
    data: {
      empresaId,
      nome: file.name,
      tipo: file.type || "application/octet-stream",
      tamanho: file.size,
      dados: buffer.toString("base64"),
      observacao: observacao || null,
      authorId: user.id,
    },
  });
  revalidatePath(PATH);
}

/* ==================== Observações ==================== */

export async function adicionarObservacao(empresaId: string, formData: FormData) {
  const user = await requireUser();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  await prisma.fichaObservacao.create({ data: { empresaId, texto, authorId: user.id } });
  revalidatePath(PATH);
}

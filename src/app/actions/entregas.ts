"use server";

import { requireUser } from "@/lib/session";
import { classify, type EntregaRow } from "@/lib/entregas";

const BASE_URL = "https://api.acessorias.com";
const MAX_PAGINAS = 200;

function getToken() {
  return process.env.ACESSORIAS_API_TOKEN || null;
}

function hojeISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function isoParaBR(iso: string | null | undefined): string {
  const m = (iso ?? "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function isoParaCompetencia(iso: string | null | undefined): string {
  const m = (iso ?? "").slice(0, 10).match(/^(\d{4})-(\d{2})-\d{2}$/);
  return m ? `${m[2]}/${m[1]}` : "";
}

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// A ferramenta só deve considerar entregas destes dois departamentos do
// Acessórias — o restante (fiscal, pessoal, societário etc.) fica de fora.
const DEPARTAMENTOS_PERMITIDOS = new Set(["celula contabil", "lancamentos"]);

function departamentoPermitido(nome: string | undefined): boolean {
  return DEPARTAMENTOS_PERMITIDOS.has(normalizarTexto(nome ?? ""));
}

type AcessoriasEntrega = {
  Nome: string;
  EntDtPrazo: string | null;
  EntDtEntrega: string | null;
  EntCompetencia: string | null;
  Status: string;
  RespEntrega: string | null;
  Config?: {
    DptoNome?: string;
    RespPrazo?: string;
    RespEntrega?: string | null;
  };
};

type AcessoriasEmpresa = {
  ID: string;
  Identificador: string;
  Razao: string;
  Fantasia?: string;
  Entregas: AcessoriasEntrega[];
};

function mapEmpresasParaRows(empresas: AcessoriasEmpresa[]): EntregaRow[] {
  const rows: EntregaRow[] = [];
  for (const empresa of empresas) {
    const nomeEmpresa = empresa.Razao || empresa.Fantasia || empresa.Identificador || "(empresa sem nome)";
    for (const e of empresa.Entregas ?? []) {
      if (!departamentoPermitido(e.Config?.DptoNome)) continue;
      rows.push({
        obrigacao: e.Nome || "",
        empresa: nomeEmpresa,
        empid: empresa.ID || empresa.Identificador || "",
        departamento: e.Config?.DptoNome || "(sem departamento)",
        respprazo: e.Config?.RespPrazo || "(sem responsável)",
        respentrega: e.RespEntrega || e.Config?.RespEntrega || "",
        dataentrega: isoParaBR(e.EntDtEntrega),
        prazolegal: isoParaBR(e.EntDtPrazo),
        competencia: isoParaCompetencia(e.EntCompetencia),
        status: e.Status || "",
        classe: classify(e.Status || ""),
      });
    }
  }
  return rows;
}

export type SyncEntregasResult = {
  rows: EntregaRow[] | null;
  totalEmpresas?: number;
  error?: string;
};

/**
 * Puxa as entregas/obrigações de todas as empresas diretamente da API do
 * Acessórias (departamentos Célula Contábil e Lançamentos apenas),
 * substituindo a necessidade de anexar o Excel exportado manualmente.
 */
export async function syncEntregasFromAcessorias(params?: { dtInicial?: string; dtFinal?: string }): Promise<SyncEntregasResult> {
  await requireUser();

  const token = getToken();
  if (!token) {
    return { rows: null, error: "Integração com o Acessórias não configurada (ACESSORIAS_API_TOKEN ausente)." };
  }

  const anoAtual = new Date().getFullYear();
  const dtInicial = params?.dtInicial || `${anoAtual}-01-01`;
  const dtFinal = params?.dtFinal || hojeISO();

  const empresas: AcessoriasEmpresa[] = [];
  try {
    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      const query = new URLSearchParams({
        DtInitial: dtInicial,
        DtFinal: dtFinal,
        DtLastDH: "2000-01-01 00:00:00",
        config: "true",
        Pagina: String(pagina),
      });
      const res = await fetch(`${BASE_URL}/deliveries/ListAll?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      // 204 = "sem conteúdo para os critérios da busca" (documentado pelo Acessórias) — não é erro, só não há mais páginas.
      if (res.status === 204) break;
      if (!res.ok) {
        const corpo = await res.text().catch(() => "");
        return { rows: null, error: `Acessórias respondeu ${res.status}${corpo ? `: ${corpo.slice(0, 300)}` : ""}` };
      }
      const corpoTexto = await res.text();
      if (!corpoTexto) break;
      const pageData = JSON.parse(corpoTexto) as AcessoriasEmpresa[];
      if (!Array.isArray(pageData) || pageData.length === 0) break;
      empresas.push(...pageData);
    }
  } catch (err) {
    return { rows: null, error: err instanceof Error ? err.message : "Falha ao conectar com a API do Acessórias." };
  }

  return { rows: mapEmpresasParaRows(empresas), totalEmpresas: empresas.length };
}

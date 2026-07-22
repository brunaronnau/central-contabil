"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/session";

const MODEL = "claude-sonnet-5";

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function stripFences(text: string) {
  return text
    .trim()
    .replace(/^```json/, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
}

/* ==================== Mapeamento de colunas assistido por IA ==================== */

export type ColumnMapping = {
  data: number | null;
  descricao: number | null;
  valor: number | null;
  debito: number | null;
  credito: number | null;
  tipo: number | null;
};

const MAPPING_SCHEMA = {
  type: "object" as const,
  properties: {
    data: { type: ["integer", "null"] },
    descricao: { type: ["integer", "null"] },
    valor: { type: ["integer", "null"] },
    debito: { type: ["integer", "null"] },
    credito: { type: ["integer", "null"] },
    tipo: { type: ["integer", "null"] },
  },
  required: ["data", "descricao", "valor", "debito", "credito", "tipo"],
  additionalProperties: false,
};

function guessColumnHeuristic(headers: string[], candidates: string[]) {
  const lower = headers.map((h) => h.toLowerCase());
  for (const cand of candidates) {
    const idx = lower.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return null;
}

function heuristicMapping(kind: "banco" | "contas", headers: string[]): ColumnMapping {
  return {
    data: guessColumnHeuristic(headers, ["data"]),
    descricao: guessColumnHeuristic(headers, ["hist", "descri", "favorecido"]),
    valor: guessColumnHeuristic(headers, ["valor"]),
    debito: kind === "banco" ? guessColumnHeuristic(headers, ["deb", "saida", "saída"]) : null,
    credito: kind === "banco" ? guessColumnHeuristic(headers, ["cred", "entrada"]) : null,
    tipo: kind === "contas" ? guessColumnHeuristic(headers, ["tipo", "natureza"]) : null,
  };
}

export async function suggestColumnMapping(
  kind: "banco" | "contas",
  headers: string[],
  sample: string[][],
): Promise<{ mapping: ColumnMapping; source: "ia" | "heuristica"; error?: string }> {
  await requireUser();

  const client = getClient();
  if (!client) {
    return { mapping: heuristicMapping(kind, headers), source: "heuristica" };
  }

  const fileLabel =
    kind === "banco"
      ? "um EXTRATO BANCÁRIO de um cliente de escritório de contabilidade brasileiro"
      : "um RELATÓRIO DE CONTAS PAGAS/RECEBIDAS enviado por um cliente de escritório de contabilidade brasileiro";

  const prompt = `Este arquivo é ${fileLabel}. Abaixo estão o cabeçalho (com índice baseado em 0) e uma amostra de linhas.

Cabeçalho: ${JSON.stringify(headers.map((h, i) => ({ indice: i, nome: h })))}
Amostra de linhas (arrays na mesma ordem do cabeçalho): ${JSON.stringify(sample.slice(0, 5))}

Identifique o índice de coluna (0-based) para cada campo. Use null quando o campo não existir no arquivo.
- data: data do lançamento/movimento
- descricao: histórico, descrição, nome do favorecido/cliente/fornecedor
- valor: coluna de valor único, podendo já vir com sinal (+/-) indicando entrada/saída. Deixe null se os valores estiverem separados em débito/crédito.
- debito: coluna de valores de débito/saída (só se separada de crédito)
- credito: coluna de valores de crédito/entrada (só se separada de débito)
- tipo: coluna de texto que indica se o lançamento é pagamento ou recebimento (só se existir, geralmente só em relatórios de contas)`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: MAPPING_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") throw new Error("sem resposta da IA");
    const mapping = JSON.parse(stripFences(block.text)) as ColumnMapping;
    return { mapping, source: "ia" };
  } catch (err) {
    return {
      mapping: heuristicMapping(kind, headers),
      source: "heuristica",
      error: err instanceof Error ? err.message : "erro desconhecido",
    };
  }
}

/* ==================== Extração universal de lançamentos de PDF ==================== */

export type ExtractedRow = { data: string; descricao: string; valor: number };

const EXTRACT_SCHEMA = {
  type: "object" as const,
  properties: {
    lancamentos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          data: { type: "string", description: "DD/MM/AAAA" },
          descricao: { type: "string" },
          valor: { type: "number", description: "negativo para saída, positivo para entrada" },
        },
        required: ["data", "descricao", "valor"],
        additionalProperties: false,
      },
    },
  },
  required: ["lancamentos"],
  additionalProperties: false,
};

export async function extractPdfRowsWithAI(
  lines: string[],
  refYear: number,
): Promise<{ rows: ExtractedRow[]; error?: string }> {
  await requireUser();

  const client = getClient();
  if (!client) {
    return { rows: [], error: "IA desativada (ANTHROPIC_API_KEY não configurada)." };
  }

  const CHUNK_SIZE = 55;
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) chunks.push(lines.slice(i, i + CHUNK_SIZE));

  const collected: ExtractedRow[] = [];
  try {
    for (let c = 0; c < chunks.length; c++) {
      const prompt = `Você está lendo um trecho de um extrato bancário ou relatório de contas (pagas/recebidas) exportado em PDF, de layout desconhecido/variável. Extraia TODOS os lançamentos financeiros reais deste trecho — ignore cabeçalhos de coluna, linhas de saldo/subtotal/total/resumo e texto institucional (SAC, ouvidoria etc.).

O ano de referência do documento é ${refYear} — use-o se a linha só tiver dia/mês.

Para cada lançamento, retorne:
- data: "DD/MM/AAAA"
- descricao: nome do favorecido/pagador/fornecedor ou histórico do lançamento (texto curto, sem números de documento)
- valor: número, NEGATIVO para saída/pagamento/débito, POSITIVO para entrada/recebimento/crédito

Trecho (${c + 1}/${chunks.length}):
"""
${chunks[c].join("\n")}
"""`;

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        thinking: { type: "disabled" },
        output_config: { format: { type: "json_schema", schema: EXTRACT_SCHEMA } },
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") continue;
      try {
        const parsed = JSON.parse(stripFences(block.text)) as { lancamentos: ExtractedRow[] };
        if (Array.isArray(parsed.lancamentos)) collected.push(...parsed.lancamentos);
      } catch {
        continue;
      }
    }

    const validRows = collected.filter(
      (item) => item && item.data && item.descricao && item.valor !== undefined && item.valor !== null && !isNaN(item.valor),
    );
    if (validRows.length === 0) {
      return { rows: [], error: "a IA não encontrou lançamentos reconhecíveis neste documento" };
    }
    return { rows: validRows };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}

/* ==================== Refinamento de sugestões com IA ==================== */

export type RefineItem = {
  idx: number;
  valor: number;
  descricao_banco: string;
  candidatos: { ci: number; descricao_contas: string; data_diff_dias: number }[];
};

export type RefineResult = { idx: number; melhor_ci: number | null; confianca: number };

const REFINE_SCHEMA = {
  type: "object" as const,
  properties: {
    resultados: {
      type: "array",
      items: {
        type: "object",
        properties: {
          idx: { type: "integer" },
          melhor_ci: { type: ["integer", "null"] },
          confianca: { type: "number", description: "0 a 1" },
        },
        required: ["idx", "melhor_ci", "confianca"],
        additionalProperties: false,
      },
    },
  },
  required: ["resultados"],
  additionalProperties: false,
};

export async function refineMatchesWithAI(items: RefineItem[]): Promise<{ results: RefineResult[]; error?: string }> {
  await requireUser();

  const client = getClient();
  if (!client) {
    return { results: [], error: "IA desativada (ANTHROPIC_API_KEY não configurada)." };
  }

  const batchSize = 15;
  const results: RefineResult[] = [];
  try {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const prompt = `Você é um especialista em conciliação bancária contábil. Para cada item da lista abaixo, escolha qual candidato (pelo campo "ci") melhor corresponde à descrição do banco, considerando que descrições bancárias costumam ser abreviadas (ex: nome de pessoa/empresa, PIX, TED). Se nenhum candidato fizer sentido, use "melhor_ci": null e confianca 0.

Itens:
${JSON.stringify(batch)}`;

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        thinking: { type: "disabled" },
        output_config: { format: { type: "json_schema", schema: REFINE_SCHEMA } },
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") continue;
      try {
        const parsed = JSON.parse(stripFences(block.text)) as { resultados: RefineResult[] };
        if (Array.isArray(parsed.resultados)) results.push(...parsed.resultados);
      } catch {
        continue;
      }
    }
    return { results };
  } catch (err) {
    return { results: [], error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}

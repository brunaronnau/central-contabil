import * as XLSX from "xlsx";

/* ==================== Tipos ==================== */

export type FileKind = "banco" | "contas";

export type ParsedFile = {
  headers: string[];
  rows: string[][];
  pdfLines: string[] | null;
};

export type Entry = { id: string; date: Date; desc: string; value: number };

export type Match = {
  bank: Entry;
  ledger: Entry;
  score: number;
  method: "auto" | "suggested" | "ai";
  status: "auto" | "pending_review" | "confirmed";
  alt: { l: Entry; score: number; diffDays: number }[];
};

export type GroupMatch = { bank: Entry; ledgers: Entry[]; total: number };

export type BankColumnMapping = {
  data: number;
  desc: number;
  split: boolean;
  valor: number;
  debito: number;
  credito: number;
};

export type ContasColumnMapping = {
  data: number;
  desc: number;
  valor: number;
  tipo: number;
  txtRec: string;
  txtPag: string;
};

/* ==================== Util: números e datas ==================== */

export function parseBRNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return NaN;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[R$\s]/g, "");
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  }
  if (/,\d{1,2}$/.test(s) && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return neg ? -Math.abs(n) : n;
}

export function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? "20" + yRaw : yRaw;
    const dt = new Date(+y, +mo - 1, +d);
    if (!isNaN(dt.getTime())) return dt;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    const dt = new Date(+y, +mo - 1, +d);
    if (!isNaN(dt.getTime())) return dt;
  }
  const dt2 = new Date(s);
  if (!isNaN(dt2.getTime())) return dt2;
  return null;
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function fmtMoney(n: number): string {
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ==================== Similaridade de texto ==================== */

function normText(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["DE", "DA", "DO", "DAS", "DOS", "LTDA", "ME", "EPP", "SA", "EIRELI", "PIX", "TED", "DOC", "CIA", "A", "O", "E"]);

function tokenSet(s: string): Set<string> {
  return new Set(normText(s).split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t)));
}

export function jaccard(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/* ==================== Leitura de planilhas ==================== */

function normalizeHeader(h: unknown): string {
  return (h ?? "").toString().trim();
}

export function guessColumn(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const cand of candidates) {
    const idx = lower.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

function detectHeaderRow(rows: string[][]): number {
  const limit = Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    const filled = row.filter((c) => c !== "" && c !== null && c !== undefined).length;
    if (filled >= Math.max(2, Math.floor(row.length * 0.4))) return i;
  }
  return 0;
}

function readWorkbook(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as string[][];
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("falha ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/* ==================== Leitura de PDF ==================== */

export async function extractPdfLines(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter(
      (it): it is typeof it & { str: string; transform: number[] } => "str" in it && it.str.trim() !== "",
    );
    const rows: { y: number; cells: { x: number; str: string }[] }[] = [];
    items.forEach((it) => {
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!row) {
        row = { y, cells: [] };
        rows.push(row);
      }
      row.cells.push({ x, str: it.str });
    });
    rows.sort((a, b) => b.y - a.y);
    rows.forEach((r) => {
      r.cells.sort((a, b) => a.x - b.x);
      const text = r.cells
        .map((c) => c.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) lines.push(text);
    });
  }
  return lines;
}

const MONEY_RE = /(-)?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})\s?([DC])?\b/g;
const DATE_RE = /(\d{2}\/\d{2}(?:\/\d{2,4})?)/;
const STOP_RE = /^(SALDO|RESUMO|ENCARGOS|OUTRAS INFORMA|INFORMA[ÇC][ÕO]ES|SAC:)/i;
const REPORT_ROW_RE = /(\d{2}\/\d{2}\/\d{2,4})\s+(\d{2}\/\d{2}\/\d{2,4})\s+(\d{2}\/\d{2}\/\d{2,4})\s+(Pg|Ab)\s+([\d.,]+)/;

function readPdfRowsHeuristic(lines: string[]): string[][] {
  let refYear = new Date().getFullYear();
  const fullText = lines.join(" ");
  const periodoMatch = fullText.match(/per[íi]odo:?\s*\d{2}\/\d{2}\/(\d{4})/i);
  const anyFullDateMatch = fullText.match(/\d{2}\/\d{2}\/(\d{4})/);
  if (periodoMatch) refYear = +periodoMatch[1];
  else if (anyFullDateMatch) refYear = +anyFullDateMatch[1];

  const isReceitaReport = /receita|recebiv|receb/i.test(fullText) && !/despesa/i.test(fullText);
  const reportSign = isReceitaReport ? 1 : -1;

  const out: string[][] = [["Data", "Descrição", "Valor"]];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const repMatch = line.match(REPORT_ROW_RE);
    if (repMatch) {
      const [, , , pagtoStr, status, valorStr] = repMatch;
      if (status === "Pg") {
        const numeric = parseFloat(valorStr.replace(/\./g, "").replace(",", "."));
        if (numeric > 0) {
          const idxEmissao = line.indexOf(repMatch[1]);
          const fornecedor = line.slice(0, idxEmissao).replace(/\s+/g, " ").trim();
          if (fornecedor && !STOP_RE.test(fornecedor)) {
            let dateStr = pagtoStr;
            const parts = dateStr.split("/");
            if (parts[2] && parts[2].length === 2) {
              dateStr = dateStr.slice(0, -2) + "20" + dateStr.slice(-2);
            }
            const value = (reportSign * numeric).toFixed(2);
            out.push([dateStr, fornecedor, value]);
          }
        }
      }
      continue;
    }

    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;

    const moneyMatches = [...line.matchAll(MONEY_RE)];
    if (moneyMatches.length === 0) continue;

    const m = moneyMatches[0];
    const isNeg = !!m[1] || (m[3] && m[3].toUpperCase() === "D");
    let value = m[2].replace(/\./g, "").replace(",", ".");
    value = (isNeg ? "-" : "") + value;

    let dateStr = dateMatch[1];
    if (dateStr.split("/").length < 3) {
      dateStr = dateStr + "/" + refYear;
    }
    const afterDate = line.slice(line.indexOf(dateMatch[1]) + dateMatch[1].length);
    const moneyIdx = afterDate.indexOf(m[0]);
    const beforeMoney = afterDate.slice(0, moneyIdx >= 0 ? moneyIdx : afterDate.length);
    let desc = beforeMoney.replace(/\s+/g, " ").trim();

    if (!desc || STOP_RE.test(desc)) continue;

    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j].trim();
      if (!nextLine) {
        j++;
        continue;
      }
      if (DATE_RE.test(nextLine)) break;
      if (STOP_RE.test(nextLine)) break;
      desc += " " + nextLine;
      j++;
    }
    desc = desc.replace(/\s+/g, " ").trim();

    if (desc) out.push([dateStr, desc, value]);
  }

  if (out.length === 1) {
    throw new Error("não encontrei linhas de lançamento reconhecíveis neste PDF — tente exportar como Excel/CSV, ou use a extração por IA");
  }
  return out;
}

async function readPdfRows(file: File): Promise<{ rows: string[][]; lines: string[] }> {
  const lines = await extractPdfLines(file);
  const rows = readPdfRowsHeuristic(lines);
  return { rows, lines };
}

export async function readAnyFile(file: File): Promise<ParsedFile> {
  if (isPdfFile(file)) {
    const { rows, lines } = await readPdfRows(file);
    const headerRowIdx = detectHeaderRow(rows);
    const headers = rows[headerRowIdx].map((h, i) => normalizeHeader(h) || `Coluna ${i + 1}`);
    const dataRows = rows.slice(headerRowIdx + 1).filter((r) => r.some((c) => c !== ""));
    return { headers, rows: dataRows, pdfLines: lines };
  }
  const rows = await readWorkbook(file);
  const headerRowIdx = detectHeaderRow(rows);
  const headers = rows[headerRowIdx].map((h, i) => normalizeHeader(h) || `Coluna ${i + 1}`);
  const dataRows = rows.slice(headerRowIdx + 1).filter((r) => r.some((c) => c !== ""));
  return { headers, rows: dataRows, pdfLines: null };
}

/* ==================== Normalização para lançamentos ==================== */

export function buildBankEntries(rows: string[][], mapping: BankColumnMapping): Entry[] {
  const out: Entry[] = [];
  rows.forEach((r, i) => {
    const date = parseDate(r[mapping.data]);
    const desc = r[mapping.desc] ?? "";
    let value: number;
    if (mapping.split) {
      const deb = mapping.debito >= 0 ? parseBRNumber(r[mapping.debito]) : 0;
      const cred = mapping.credito >= 0 ? parseBRNumber(r[mapping.credito]) : 0;
      value = (isNaN(cred) ? 0 : Math.abs(cred)) - (isNaN(deb) ? 0 : Math.abs(deb));
    } else {
      value = parseBRNumber(r[mapping.valor]);
    }
    if (date && !isNaN(value) && value !== 0) {
      out.push({ id: "b" + i, date, desc, value });
    }
  });
  return out;
}

export function buildLedgerEntries(rows: string[][], mapping: ContasColumnMapping): Entry[] {
  const out: Entry[] = [];
  const txtRec = mapping.txtRec.toLowerCase();
  const txtPag = mapping.txtPag.toLowerCase();
  rows.forEach((r, i) => {
    const date = parseDate(r[mapping.data]);
    const desc = r[mapping.desc] ?? "";
    let value = parseBRNumber(r[mapping.valor]);
    if (mapping.tipo >= 0) {
      const tipoTxt = (r[mapping.tipo] ?? "").toString().toLowerCase();
      if (tipoTxt.includes(txtPag)) value = -Math.abs(value);
      else if (tipoTxt.includes(txtRec)) value = Math.abs(value);
    }
    if (date && !isNaN(value) && value !== 0) {
      out.push({ id: "l" + i, date, desc, value });
    }
  });
  return out;
}

/* ==================== Motor de conciliação ==================== */

export type ReconciliationResult = {
  matches: Match[];
  groupMatches: GroupMatch[];
  pendBanco: Entry[];
  pendContas: Entry[];
};

export function runReconciliation(
  bankEntries: Entry[],
  ledgerEntries: Entry[],
  tol: number,
  dayWindow: number,
  simThreshold: number,
): ReconciliationResult {
  type Pair = { b: Entry; l: Entry; diff: number; diffDays: number; descScore: number; combined: number };
  const pairs: Pair[] = [];

  bankEntries.forEach((b) => {
    ledgerEntries.forEach((l) => {
      if (Math.sign(l.value) !== Math.sign(b.value)) return;
      const diff = Math.abs(Math.abs(l.value) - Math.abs(b.value));
      if (diff > tol) return;
      const diffDays = Math.abs((l.date.getTime() - b.date.getTime()) / 86400000);
      if (diffDays > dayWindow) return;
      const descScore = jaccard(b.desc, l.desc);
      const valueScore = tol > 0 ? Math.max(0, 1 - diff / tol) : diff === 0 ? 1 : 0;
      const dateScore = dayWindow > 0 ? Math.max(0, 1 - diffDays / dayWindow) : 1;
      const combined = valueScore * 0.5 + dateScore * 0.2 + descScore * 0.3;
      pairs.push({ b, l, diff, diffDays, descScore, combined });
    });
  });

  const bankCandCount = new Map<string, number>();
  const ledgerCandCount = new Map<string, number>();
  const bankCandidates = new Map<string, Pair[]>();
  pairs.forEach((p) => {
    bankCandCount.set(p.b.id, (bankCandCount.get(p.b.id) || 0) + 1);
    ledgerCandCount.set(p.l.id, (ledgerCandCount.get(p.l.id) || 0) + 1);
    if (!bankCandidates.has(p.b.id)) bankCandidates.set(p.b.id, []);
    bankCandidates.get(p.b.id)!.push(p);
  });

  pairs.sort((a, c) => {
    const exactA = a.diff < 0.005 ? 1 : 0;
    const exactC = c.diff < 0.005 ? 1 : 0;
    if (exactA !== exactC) return exactC - exactA;
    return c.combined - a.combined;
  });

  const usedBank = new Set<string>();
  const usedLedger = new Set<string>();
  const matches: Match[] = [];

  pairs.forEach((p) => {
    if (usedBank.has(p.b.id) || usedLedger.has(p.l.id)) return;
    const unique = bankCandCount.get(p.b.id) === 1 || ledgerCandCount.get(p.l.id) === 1;
    const exact = p.diff < 0.005;
    const autoMatch = exact && (unique || p.descScore >= simThreshold);

    usedBank.add(p.b.id);
    usedLedger.add(p.l.id);

    const alt = (bankCandidates.get(p.b.id) || [])
      .filter((c) => c.l.id !== p.l.id)
      .sort((a, c) => c.combined - a.combined)
      .slice(0, 3)
      .map((c) => ({ l: c.l, score: c.descScore, diffDays: c.diffDays }));

    matches.push({
      bank: p.b,
      ledger: p.l,
      score: p.descScore,
      method: autoMatch ? "auto" : "suggested",
      status: autoMatch ? "auto" : "pending_review",
      alt,
    });
  });

  const bankPending1to1 = bankEntries.filter((b) => !usedBank.has(b.id));
  const ledgerPending1to1 = ledgerEntries.filter((l) => !usedLedger.has(l.id));

  const sumResult = findSumMatches(bankPending1to1, ledgerPending1to1, dayWindow);

  return {
    matches,
    groupMatches: sumResult.groupMatches,
    pendBanco: sumResult.remainingBank,
    pendContas: sumResult.remainingLedger,
  };
}

function findSumMatches(bankList: Entry[], ledgerList: Entry[], dayWindow: number) {
  const usedLedgerIds = new Set<string>();
  const groupMatches: GroupMatch[] = [];
  const remainingBank: Entry[] = [];

  bankList.forEach((b) => {
    const candidates = ledgerList.filter(
      (l) => !usedLedgerIds.has(l.id) && Math.sign(l.value) === Math.sign(b.value) && Math.abs((l.date.getTime() - b.date.getTime()) / 86400000) <= dayWindow,
    );

    if (candidates.length < 2) {
      remainingBank.push(b);
      return;
    }

    const targetCents = Math.round(Math.abs(b.value) * 100);
    const sorted = candidates.slice().sort((x, y) => Math.abs(y.value) - Math.abs(x.value));
    const found = subsetSumSearch(sorted, targetCents, 8);

    if (found) {
      found.forEach((l) => usedLedgerIds.add(l.id));
      groupMatches.push({ bank: b, ledgers: found, total: found.reduce((s, l) => s + Math.abs(l.value), 0) });
    } else {
      remainingBank.push(b);
    }
  });

  const remainingLedger = ledgerList.filter((l) => !usedLedgerIds.has(l.id));
  return { groupMatches, remainingBank, remainingLedger };
}

function subsetSumSearch(items: Entry[], targetCents: number, maxSize: number): Entry[] | null {
  let nodeBudget = 200000;
  let result: Entry[] | null = null;

  function rec(idx: number, remainingCents: number, chosen: Entry[]) {
    if (result || nodeBudget-- <= 0) return;
    if (remainingCents === 0 && chosen.length >= 2) {
      result = chosen.slice();
      return;
    }
    if (idx >= items.length || chosen.length >= maxSize || remainingCents < 0) return;

    const cents = Math.round(Math.abs(items[idx].value) * 100);
    if (cents <= remainingCents) {
      chosen.push(items[idx]);
      rec(idx + 1, remainingCents - cents, chosen);
      chosen.pop();
      if (result) return;
    }
    rec(idx + 1, remainingCents, chosen);
  }

  rec(0, targetCents, []);
  return result;
}

/* ==================== Exportação para Excel ==================== */

export function exportExcel(
  matches: Match[],
  groupMatches: GroupMatch[],
  pendBanco: Entry[],
  pendContas: Entry[],
  bankEntries: Entry[],
  ledgerEntries: Entry[],
) {
  const wb = XLSX.utils.book_new();

  const conciliadosAoa: (string | number)[][] = [
    ["Data Banco", "Descrição Banco", "Valor Banco", "Data Contas", "Descrição Contas", "Valor Contas", "Método", "Confiança"],
  ];
  matches.forEach((m) => {
    conciliadosAoa.push([
      fmtDate(m.bank.date),
      m.bank.desc,
      m.bank.value,
      fmtDate(m.ledger.date),
      m.ledger.desc,
      m.ledger.value,
      m.method === "auto" ? "Automático" : m.method === "ai" ? "IA" : "Revisão manual",
      Math.round((m.score || 0) * 100) + "%",
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(conciliadosAoa), "Conciliados");

  const somaAoa: (string | number)[][] = [["Data Banco", "Descrição Banco", "Valor Banco", "Data Contas", "Descrição Contas", "Valor Contas"]];
  groupMatches.forEach((g) => {
    g.ledgers.forEach((l, i) => {
      somaAoa.push([
        i === 0 ? fmtDate(g.bank.date) : "",
        i === 0 ? g.bank.desc : "",
        i === 0 ? g.bank.value : "",
        fmtDate(l.date),
        l.desc,
        l.value,
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(somaAoa), "Conciliados - Soma");

  const pbAoa: (string | number)[][] = [["Data", "Descrição", "Valor"]];
  pendBanco.forEach((e) => pbAoa.push([fmtDate(e.date), e.desc, e.value]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pbAoa), "Pendentes - Banco");

  const pcAoa: (string | number)[][] = [["Data", "Descrição", "Valor"]];
  pendContas.forEach((e) => pcAoa.push([fmtDate(e.date), e.desc, e.value]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pcAoa), "Pendentes - Contas");

  const totalBanco = bankEntries.reduce((s, b) => s + b.value, 0);
  const totalConciliado = matches.reduce((s, m) => s + m.bank.value, 0) + groupMatches.reduce((s, g) => s + g.bank.value, 0);
  const resumoAoa: (string | number)[][] = [
    ["Resumo da Conciliação", ""],
    ["Data de geração", new Date().toLocaleString("pt-BR")],
    ["", ""],
    ["Itens no extrato bancário", bankEntries.length],
    ["Itens no relatório de contas", ledgerEntries.length],
    ["Itens conciliados (1 para 1)", matches.length],
    ["Itens conciliados (soma, N para 1)", groupMatches.length],
    ["Itens pendentes (banco)", pendBanco.length],
    ["Itens pendentes (contas)", pendContas.length],
    ["", ""],
    ["Valor total do extrato", totalBanco],
    ["Valor total conciliado", totalConciliado],
    ["Valor pendente", totalBanco - totalConciliado],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoAoa), "Resumo");

  const ts = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `conciliacao_bancaria_navecon_${ts}.xlsx`);
}

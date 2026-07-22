import * as XLSX from "xlsx";
import Papa from "papaparse";

export type EntregaClasse = "entregue" | "pendente" | "atrasada" | "justificada" | "dispensada" | "outro";

export type EntregaRow = {
  obrigacao: string;
  empresa: string;
  empid: string;
  departamento: string;
  respprazo: string;
  respentrega: string;
  dataentrega: string;
  prazolegal: string;
  competencia: string;
  status: string;
  classe: EntregaClasse;
};

export type MonthlyStat = { mes: string; entregues: number; pendentes: number; atrasadas: number; justificadas: number };

export type EntregasStats = {
  total: number;
  dispensadas: number;
  ativas: number;
  entregues: number;
  pendentes: number;
  atrasadas: number;
  justificadas: number;
  pctEntregue: number;
  porDiaPessoa: Record<string, Record<string, number>>;
  diasComEntrega: string[];
  rankingPessoas: { nome: string; total: number }[];
  porMesDetalhado: MonthlyStat[];
  competenciasDisponiveis: string[];
  empresasDistintas: number;
  responsaveisDistintos: number;
};

export type PeriodBucket = {
  nome: string;
  total: number;
  entregues: number;
  pendentes: number;
  atrasadas: number;
  justificadas: number;
};

/* ==================== Formatação ==================== */

export function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function pct(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

/* ==================== Parsing ==================== */

function norm(s: string | undefined | null): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const CANON: Record<string, string[]> = {
  obrigacao: ["obrigacao / tarefa", "obrigacao/tarefa", "obrigacao", "tarefa"],
  empresa: ["empresa"],
  empid: ["empid", "emp id"],
  cnpj: ["cnpj"],
  cidade: ["cidade"],
  estado: ["estado", "uf"],
  prazolegal: ["prazo legal"],
  prazotecnico: ["prazo tecnico"],
  dataentrega: ["data da entrega", "data entrega"],
  status: ["status"],
  departamento: ["departamento"],
  respprazo: ["responsavel prazo"],
  respentrega: ["responsavel entrega"],
  competencia: ["competencia"],
  protocolo: ["protocolo"],
};

export function mapHeaders(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((h) => {
    const n = norm(h);
    for (const key of Object.keys(CANON)) {
      if (CANON[key].includes(n)) map[key] = h;
    }
  });
  return map;
}

export function classify(status: string | undefined | null): EntregaClasse {
  const s = (status ?? "").trim();
  if (!s) return "pendente";
  if (s === "Dispensada") return "dispensada";
  if (s === "Pendente" || s === "Prazo técnico") return "pendente";
  if (s === "Atrasada!") return "atrasada";
  if (s === "Atraso justificado" || s === "Pend. justificada") return "justificada";
  if (s === "Ent. PzTéc." || s === "Ent. antecipada" || s === "Ent. atrasada" || s === "Ent. justificada") return "entregue";
  return "outro";
}

export function readEntregasFile(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: (err: Error) => reject(err),
      });
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result as ArrayBuffer, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[];
        resolve(data);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("falha ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseEntregasRows(data: Record<string, string>[]): { rows: EntregaRow[] | null; error?: string } {
  if (!data || data.length === 0) {
    return { rows: null, error: "Arquivo vazio ou ilegível." };
  }
  const map = mapHeaders(Object.keys(data[0]));
  if (!map.status) {
    return { rows: null, error: 'Não encontrei a coluna "Status" — confirme se é o relatório de Gestão de Entregas (S3D).' };
  }
  const rows: EntregaRow[] = data.map((row) => ({
    obrigacao: row[map.obrigacao] || "",
    empresa: row[map.empresa] || "",
    empid: row[map.empid] || "",
    departamento: row[map.departamento] || "(sem departamento)",
    respprazo: row[map.respprazo] || "(sem responsável)",
    respentrega: row[map.respentrega] || "",
    dataentrega: row[map.dataentrega] || "",
    prazolegal: row[map.prazolegal] || "",
    competencia: row[map.competencia] || "",
    status: row[map.status] || "",
    classe: classify(row[map.status] || ""),
  }));
  return { rows };
}

/* ==================== Datas / competência ==================== */

export function compSortable(c: string | undefined | null): string | null {
  if (!c) return null;
  const m = c.toString().trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[2]}-${m[1].padStart(2, "0")}`;
}

export function parseDateBR(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = s.toString().trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function diasEntreDatasIso(isoRecente: string, isoAntiga: string): number {
  const a = new Date(isoRecente + "T00:00:00");
  const b = new Date(isoAntiga + "T00:00:00");
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/* ==================== Agregações ==================== */

export function buildMonthly(rows: EntregaRow[]): MonthlyStat[] {
  const map = new Map<string, MonthlyStat>();
  rows.forEach((r) => {
    if (r.classe === "dispensada") return;
    const mes = r.competencia || "(sem competência)";
    if (!map.has(mes)) map.set(mes, { mes, entregues: 0, pendentes: 0, atrasadas: 0, justificadas: 0 });
    const bucket = map.get(mes)!;
    if (r.classe === "entregue") bucket.entregues++;
    else if (r.classe === "pendente") bucket.pendentes++;
    else if (r.classe === "atrasada") bucket.atrasadas++;
    else if (r.classe === "justificada") bucket.justificadas++;
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.mes === "(sem competência)") return 1;
    if (b.mes === "(sem competência)") return -1;
    const ka = compSortable(a.mes) ?? "";
    const kb = compSortable(b.mes) ?? "";
    return ka.localeCompare(kb);
  });
}

export function computeStats(rows: EntregaRow[]): EntregasStats {
  const total = rows.length;
  const dispensadas = rows.filter((r) => r.classe === "dispensada").length;
  const ativas = total - dispensadas;
  const entregues = rows.filter((r) => r.classe === "entregue").length;
  const pendentes = rows.filter((r) => r.classe === "pendente").length;
  const atrasadas = rows.filter((r) => r.classe === "atrasada").length;
  const justificadas = rows.filter((r) => r.classe === "justificada").length;
  const pctEntregue = ativas ? (entregues / ativas) * 100 : 0;

  const porDiaPessoa: Record<string, Record<string, number>> = {};
  rows.forEach((r) => {
    const iso = parseDateBR(r.dataentrega);
    if (!iso) return;
    const pessoa = r.respprazo || "(sem responsável)";
    if (!porDiaPessoa[iso]) porDiaPessoa[iso] = {};
    porDiaPessoa[iso][pessoa] = (porDiaPessoa[iso][pessoa] ?? 0) + 1;
  });
  const diasComEntrega = Object.keys(porDiaPessoa).sort((a, b) => b.localeCompare(a));

  const totalPorPessoa = new Map<string, number>();
  diasComEntrega.forEach((iso) => {
    Object.entries(porDiaPessoa[iso]).forEach(([nome, qtd]) => {
      totalPorPessoa.set(nome, (totalPorPessoa.get(nome) ?? 0) + qtd);
    });
  });
  const rankingPessoas = Array.from(totalPorPessoa.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);

  const porMesDetalhado = buildMonthly(rows);
  const competenciasDisponiveis = porMesDetalhado.map((m) => m.mes).filter((m) => m !== "(sem competência)");
  const empresasDistintas = new Set(rows.map((r) => r.empid || r.empresa)).size;
  const responsaveisDistintos = new Set(rows.map((r) => r.respprazo).filter((x) => x && x !== "(sem responsável)")).size;

  return {
    total,
    dispensadas,
    ativas,
    entregues,
    pendentes,
    atrasadas,
    justificadas,
    pctEntregue,
    porDiaPessoa,
    diasComEntrega,
    rankingPessoas,
    porMesDetalhado,
    competenciasDisponiveis,
    empresasDistintas,
    responsaveisDistintos,
  };
}

function bucketFor(map: Map<string, PeriodBucket>, nome: string): PeriodBucket {
  if (!map.has(nome)) map.set(nome, { nome, total: 0, entregues: 0, pendentes: 0, atrasadas: 0, justificadas: 0 });
  return map.get(nome)!;
}

function incClasse(bucket: PeriodBucket, classe: EntregaClasse) {
  bucket.total++;
  if (classe === "entregue") bucket.entregues++;
  else if (classe === "pendente") bucket.pendentes++;
  else if (classe === "atrasada") bucket.atrasadas++;
  else if (classe === "justificada") bucket.justificadas++;
}

export type PeriodResult = { porTarefa: PeriodBucket[]; porPessoa: PeriodBucket[]; totalRows: number };

export function computePeriodStats(rows: EntregaRow[], startComp: string, endComp: string): PeriodResult | null {
  const startKey = compSortable(startComp);
  const endKey = compSortable(endComp);
  if (!startKey || !endKey || startKey > endKey) return null;

  const filtered = rows.filter((r) => {
    const k = compSortable(r.competencia);
    return k !== null && k >= startKey && k <= endKey;
  });

  const tarefaMap = new Map<string, PeriodBucket>();
  const pessoaMap = new Map<string, PeriodBucket>();
  filtered.forEach((r) => {
    if (r.classe === "dispensada") return;
    incClasse(bucketFor(tarefaMap, r.obrigacao || "(sem tarefa)"), r.classe);
    incClasse(bucketFor(pessoaMap, r.respprazo || "(sem responsável)"), r.classe);
  });

  return {
    porTarefa: Array.from(tarefaMap.values()).sort((a, b) => b.total - a.total),
    porPessoa: Array.from(pessoaMap.values()).sort((a, b) => b.total - a.total),
    totalRows: filtered.length,
  };
}

export function computePeriodStatsPorPessoa(
  rows: EntregaRow[],
  startComp: string,
  endComp: string,
  pessoa: string,
): { porTarefa: PeriodBucket[]; totalRows: number } | null {
  const startKey = compSortable(startComp);
  const endKey = compSortable(endComp);
  if (!startKey || !endKey || startKey > endKey) return null;

  const filtered = rows.filter((r) => {
    const k = compSortable(r.competencia);
    if (k === null || k < startKey || k > endKey) return false;
    return (r.respprazo || "(sem responsável)") === pessoa;
  });

  const tarefaMap = new Map<string, PeriodBucket>();
  filtered.forEach((r) => {
    if (r.classe === "dispensada") return;
    incClasse(bucketFor(tarefaMap, r.obrigacao || "(sem tarefa)"), r.classe);
  });

  return {
    porTarefa: Array.from(tarefaMap.values()).sort((a, b) => b.total - a.total),
    totalRows: filtered.length,
  };
}

export function ultimaEntregaPorPessoa(stats: EntregasStats): Record<string, string> {
  const ultima: Record<string, string> = {};
  stats.diasComEntrega.forEach((iso) => {
    Object.keys(stats.porDiaPessoa[iso]).forEach((nome) => {
      if (!(nome in ultima)) ultima[nome] = iso;
    });
  });
  return ultima;
}

const LIMITE_DIAS_INATIVIDADE = 10;

export type HeatmapData = {
  diasAsc: string[];
  pessoas: string[];
  matriz: Record<string, Record<string, number>>;
  ocultos: number;
  ocultosNomes: string[];
};

export function computeHeatmap(stats: EntregasStats): HeatmapData | null {
  if (stats.diasComEntrega.length === 0) return null;
  const dias = stats.diasComEntrega.slice(0, 14);
  const dataReferencia = stats.diasComEntrega[0];
  const ultima = ultimaEntregaPorPessoa(stats);

  const pessoasVisiveis = stats.rankingPessoas.filter((p) => {
    const ult = ultima[p.nome];
    return !!ult && diasEntreDatasIso(dataReferencia, ult) <= LIMITE_DIAS_INATIVIDADE;
  });
  const ocultosNomes = stats.rankingPessoas.filter((p) => !pessoasVisiveis.includes(p)).map((p) => p.nome);

  if (pessoasVisiveis.length === 0) return { diasAsc: [], pessoas: [], matriz: {}, ocultos: ocultosNomes.length, ocultosNomes };

  const diasAsc = [...dias].reverse();
  return {
    diasAsc,
    pessoas: pessoasVisiveis.map((p) => p.nome),
    matriz: stats.porDiaPessoa,
    ocultos: ocultosNomes.length,
    ocultosNomes,
  };
}

export function heatmapLevel(qtd: number): 0 | 1 | 2 | 3 | 4 {
  if (qtd === 0) return 0;
  if (qtd === 1) return 1;
  if (qtd <= 3) return 2;
  if (qtd <= 6) return 3;
  return 4;
}

const STATUS_PONTUAL = new Set(["Ent. antecipada", "Ent. PzTéc."]);
const STATUS_ENTREGUE_COM_ATRASO = new Set(["Ent. atrasada", "Ent. justificada"]);

export type MetricasGeral = {
  taxaCumprimento: number;
  taxaPontualidadeReal: number;
  taxaAtrasoCritico: number;
  produtividadeMedia: number;
  numPessoas: number;
  numMeses: number;
  cargaTotal: number;
  totalRows: number;
};

export function computeMetricasGeral(rows: EntregaRow[], startComp: string, endComp: string): MetricasGeral | null {
  const startKey = compSortable(startComp);
  const endKey = compSortable(endComp);
  if (!startKey || !endKey || startKey > endKey) return null;

  const filtered = rows.filter((r) => {
    const k = compSortable(r.competencia);
    return k !== null && k >= startKey && k <= endKey;
  });

  let dispensadas = 0;
  let entregues = 0;
  let pendentes = 0;
  let atrasadas = 0;
  let justificadas = 0;
  let pontual = 0;
  let atrasoEntrega = 0;
  const pessoasSet = new Set<string>();
  const mesesSet = new Set<string>();

  filtered.forEach((r) => {
    mesesSet.add(r.competencia);
    if (r.classe === "dispensada") {
      dispensadas++;
      return;
    }
    pessoasSet.add(r.respprazo || "(sem responsável)");
    if (r.classe === "entregue") entregues++;
    else if (r.classe === "pendente") pendentes++;
    else if (r.classe === "atrasada") atrasadas++;
    else if (r.classe === "justificada") justificadas++;
    const statusOriginal = (r.status || "").trim();
    if (STATUS_PONTUAL.has(statusOriginal)) pontual++;
    else if (STATUS_ENTREGUE_COM_ATRASO.has(statusOriginal)) atrasoEntrega++;
  });
  void pendentes;
  void justificadas;
  void atrasoEntrega;

  const ativas = filtered.length - dispensadas;
  const numPessoas = pessoasSet.size;
  const numMeses = mesesSet.size || 1;
  const produtividadeMedia = numPessoas > 0 ? ativas / numPessoas / numMeses : 0;

  return {
    taxaCumprimento: ativas > 0 ? (entregues / ativas) * 100 : 0,
    taxaPontualidadeReal: ativas > 0 ? (pontual / ativas) * 100 : 0,
    taxaAtrasoCritico: ativas > 0 ? (atrasadas / ativas) * 100 : 0,
    produtividadeMedia,
    numPessoas,
    numMeses,
    cargaTotal: ativas,
    totalRows: filtered.length,
  };
}

export type GraficosMensal = { meses: MonthlyStat[]; tendenciaMensal: { mes: string; taxa: number }[] };

export function computeGraficosMensal(stats: EntregasStats, startComp: string, endComp: string): GraficosMensal | null {
  const startKey = compSortable(startComp);
  const endKey = compSortable(endComp);
  if (!startKey || !endKey || startKey > endKey) return null;

  const meses = stats.porMesDetalhado.filter((m) => {
    if (m.mes === "(sem competência)") return false;
    const k = compSortable(m.mes);
    return k !== null && k >= startKey && k <= endKey;
  });

  const tendenciaMensal = meses.map((m) => {
    const totalMes = m.entregues + m.pendentes + m.atrasadas + m.justificadas;
    return { mes: m.mes, taxa: totalMes > 0 ? (m.entregues / totalMes) * 100 : 0 };
  });

  return { meses, tendenciaMensal };
}

/* ==================== Último upload (localStorage) ==================== */

const LAST_UPLOAD_KEY = "nvc_entregas_last_upload";

export type LastUpload = { nome: string; arquivo: string; timestamp: number };

export function saveLastUpload(info: LastUpload) {
  try {
    localStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(info));
  } catch {
    // localStorage indisponível — não é crítico
  }
}

export function loadLastUpload(): LastUpload | null {
  try {
    const raw = localStorage.getItem(LAST_UPLOAD_KEY);
    return raw ? (JSON.parse(raw) as LastUpload) : null;
  } catch {
    return null;
  }
}

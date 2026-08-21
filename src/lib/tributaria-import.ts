import * as XLSX from "xlsx";
import type { MesesDados } from "@/lib/tributaria";

/**
 * Importa dados mensais a partir do modelo padrão de planilha de Análise
 * Tributária (aba "DADOS") já usado pela equipe. Só lê e mapeia valores —
 * nenhuma fórmula de cálculo daqui entra na apuração; os números importados
 * caem exatamente nos mesmos campos que hoje são preenchidos à mão, e o
 * motor de cálculo (calcularPresumido/calcularReal) nem sabe a diferença.
 *
 * Receita (Comércio/Serviço/Intercompany) e LALUR (Lucro/Adições/Exclusões/
 * IRRF) ficam de fora de propósito: o layout dessa parte muda de cliente
 * pra cliente na planilha, e o risco de importar errado (ex.: "Lucro" da
 * aba LALUR é saldo acumulado, não valor do mês) é maior que o benefício.
 */

type CampoSecao = { rotulo: string; variantes: string[]; key: keyof MesesDados };
type Secao = { titulo: string; tituloBusca: string; campos: CampoSecao[] };

const SECOES: Secao[] = [
  {
    titulo: "PIS",
    tituloBusca: "apuracao de pis",
    campos: [
      { rotulo: "Débito", variantes: ["debitos", "debito"], key: "pisDebito" },
      { rotulo: "Estoque", variantes: ["estoque"], key: "pisEstoque" },
      { rotulo: "Crédito", variantes: ["creditos", "credito"], key: "pisCredito" },
    ],
  },
  {
    titulo: "COFINS",
    tituloBusca: "apuracao de cofins",
    campos: [
      { rotulo: "Débito", variantes: ["debitos", "debito"], key: "cofinsDebito" },
      { rotulo: "Estoque", variantes: ["estoque"], key: "cofinsEstoque" },
      { rotulo: "Crédito", variantes: ["creditos", "credito"], key: "cofinsCredito" },
    ],
  },
  {
    titulo: "ICMS TTD",
    tituloBusca: "apuracao de icms ttd",
    campos: [
      { rotulo: "Débito", variantes: ["debitos", "debito"], key: "icmsTTDDebito" },
      { rotulo: "Estoque", variantes: ["estoque"], key: "icmsTTDEstoque" },
      { rotulo: "Crédito", variantes: ["creditos", "credito"], key: "icmsTTDCredito" },
    ],
  },
  {
    titulo: "ICMS",
    tituloBusca: "apuracao de icms normal",
    campos: [
      { rotulo: "Débito", variantes: ["debitos", "debito"], key: "icmsDebito" },
      { rotulo: "Estoque", variantes: ["estoque"], key: "icmsEstoque" },
      { rotulo: "Crédito", variantes: ["creditos", "credito"], key: "icmsCredito" },
    ],
  },
  {
    titulo: "IPI",
    tituloBusca: "apuracao de ipi",
    campos: [
      { rotulo: "Débito", variantes: ["debitos", "debito"], key: "ipiDebito" },
      { rotulo: "Crédito", variantes: ["creditos", "credito"], key: "ipiCredito" },
    ],
  },
  {
    titulo: "Fundos Estaduais",
    tituloBusca: "apuracao de fundos",
    campos: [{ rotulo: "Valor", variantes: ["liquido"], key: "fundos" }],
  },
  {
    titulo: "INSS Patronal",
    tituloBusca: "inss patronal",
    campos: [{ rotulo: "Valor", variantes: ["liquido"], key: "inssPatronalManual" }],
  },
  {
    titulo: "ISS",
    tituloBusca: "apuracao de iss",
    campos: [{ rotulo: "Valor", variantes: ["liquido"], key: "issValor" }],
  },
  {
    titulo: "Simples Apurado",
    tituloBusca: "apuracao de simples",
    campos: [{ rotulo: "Valor", variantes: ["liquido"], key: "simplesApurado" }],
  },
  {
    titulo: "Folha de Pagamento",
    tituloBusca: "folha de pagamento",
    campos: [
      { rotulo: "Pró-labore", variantes: ["pro-labore", "pro labore", "prolabore"], key: "proLabore" },
      { rotulo: "Base INSS", variantes: ["bc trib.", "bc trib", "bc inss", "base de calculo inss"], key: "bcInss" },
    ],
  },
];

const MESES_NORM = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function norm(s: unknown): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const MES_ANO_RE = new RegExp(`^(${MESES_NORM.join("|")})[-/](\\d{2,4})$`);

// Acha o ano da planilha lendo os cabeçalhos "Jan-26"/"Jan-2026" (linha de
// título da área de Faturamento, no topo da aba "DADOS") — assim dá pra
// importar o histórico de anos anteriores sem precisar mudar o seletor de
// "Ano de Referência" manualmente antes de cada arquivo.
function detectarAno(grid: unknown[][]): number | null {
  for (const linha of grid) {
    for (const cel of linha ?? []) {
      const m = MES_ANO_RE.exec(norm(cel));
      if (m) {
        const raw = parseInt(m[2], 10);
        return raw < 100 ? 2000 + raw : raw;
      }
    }
  }
  return null;
}

function parseValor(raw: unknown): number {
  const s = (raw ?? "").toString().trim();
  if (!s) return 0;
  const negativo = /^\(.*\)$/.test(s);
  let t = negativo ? s.slice(1, -1) : s;
  t = t.replace(/r\$/gi, "").trim();
  if (!t || t === "-") return 0;
  t = t.replace(/\s/g, "");
  // Decide o separador decimal pelo que aparece por último (","/"." de milhar
  // variam entre planilhas — o BR usa vírgula decimal, essas planilhas usam ponto).
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  if (lastComma > lastDot) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(/,/g, "");
  }
  const n = parseFloat(t);
  return isNaN(n) ? 0 : negativo ? -n : n;
}

function encontrarLinhaSecao(grid: unknown[][], tituloBusca: string): number | null {
  for (let i = 0; i < grid.length; i++) {
    if (norm(grid[i]?.[0]).includes(tituloBusca)) return i;
  }
  return null;
}

function encontrarColunasMeses(grid: unknown[][], apartirDe: number): { linha: number; colunas: number[] } | null {
  for (let i = apartirDe; i < Math.min(grid.length, apartirDe + 4); i++) {
    const linha = grid[i] ?? [];
    const colunas: number[] = new Array(12).fill(-1);
    let achados = 0;
    linha.forEach((cel, c) => {
      const idx = MESES_NORM.indexOf(norm(cel));
      if (idx >= 0 && colunas[idx] === -1) {
        colunas[idx] = c;
        achados++;
      }
    });
    if (achados >= 6) return { linha: i, colunas };
  }
  return null;
}

function encontrarLinhaRotulo(grid: unknown[][], apartirDe: number, ateNoMax: number, variantes: string[]): number | null {
  for (let i = apartirDe; i <= Math.min(grid.length - 1, ateNoMax); i++) {
    const primeira = norm(grid[i]?.[0]);
    if (variantes.some((v) => primeira === v || primeira.startsWith(v))) return i;
  }
  return null;
}

export type ImportacaoResultado = {
  dados: Partial<MesesDados>;
  encontrados: string[];
  naoEncontrados: string[];
  ano: number | null;
};

export function importarDeWorkbook(wb: XLSX.WorkBook): ImportacaoResultado {
  const sheet = wb.Sheets["DADOS"];
  if (!sheet) {
    throw new Error('Não encontrei a aba "DADOS" nesse arquivo — confirme se é o modelo padrão de Análise Tributária.');
  }
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
  const ano = detectarAno(grid);

  const dados: Partial<MesesDados> = {};
  const encontrados: string[] = [];
  const naoEncontrados: string[] = [];

  for (const secao of SECOES) {
    const linhaTitulo = encontrarLinhaSecao(grid, secao.tituloBusca);
    if (linhaTitulo === null) {
      secao.campos.forEach((c) => naoEncontrados.push(`${secao.titulo} — ${c.rotulo}`));
      continue;
    }
    const header = encontrarColunasMeses(grid, linhaTitulo + 1);
    if (!header) {
      secao.campos.forEach((c) => naoEncontrados.push(`${secao.titulo} — ${c.rotulo}`));
      continue;
    }
    for (const campo of secao.campos) {
      const linhaRotulo = encontrarLinhaRotulo(grid, header.linha + 1, header.linha + 8, campo.variantes);
      if (linhaRotulo === null) {
        naoEncontrados.push(`${secao.titulo} — ${campo.rotulo}`);
        continue;
      }
      const linhaDados = grid[linhaRotulo] ?? [];
      const valores = header.colunas.map((c) => (c === -1 ? 0 : parseValor(linhaDados[c])));
      dados[campo.key] = valores;
      encontrados.push(`${secao.titulo} — ${campo.rotulo}`);
    }
  }

  return { dados, encontrados, naoEncontrados, ano };
}

export function lerWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(XLSX.read(e.target!.result as ArrayBuffer, { type: "array" }));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsArrayBuffer(file);
  });
}

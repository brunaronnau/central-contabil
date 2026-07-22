/* ==================== Tipos ==================== */

export type Atividade =
  | "comercio_industria"
  | "transporte_carga"
  | "transporte_outros"
  | "hospitalar"
  | "servicos_gerais"
  | "intermediacao"
  | "locacao_adm"
  | "profissionais";

export type RegimeAtual = "simples" | "presumido" | "real";

export type MesesDados = {
  receitaComercio: number[];
  receitaServico: number[];
  receitaIntercompany: number[];
  proLabore: number[];
  bcInss: number[];
  simplesApurado: number[];
  inssPatronalManual: number[];
  icmsDebito: number[];
  icmsCredito: number[];
  icmsEstoque: number[];
  icmsTTDDebito: number[];
  icmsTTDCredito: number[];
  icmsTTDEstoque: number[];
  issValor: number[];
  fundos: number[];
  ipiDebito: number[];
  ipiCredito: number[];
  pisDebito: number[];
  pisCredito: number[];
  pisEstoque: number[];
  cofinsDebito: number[];
  cofinsCredito: number[];
  cofinsEstoque: number[];
  lucroContabil: number[];
  adicoes: number[];
  exclusoes: number[];
  irrf: number[];
};

export type Empresa = {
  id: string;
  nome: string;
  cnpj: string;
  atividade: Atividade;
  regimeAtual: RegimeAtual;
  prejuizoInicial: number;
  anos: Record<number, MesesDados>;
};

export type Grupo = {
  id: string;
  grupoNome: string;
  grupoResponsavel: string;
  grupoData: string;
  anoSelecionado: number;
  empresas: Empresa[];
};

/* ==================== Constantes ==================== */

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const ANO_INICIAL = 2021;

export const PRESUNCAO: Record<Atividade, { label: string; irpj: number; csll: number }> = {
  comercio_industria: { label: "Comércio e Indústria", irpj: 0.08, csll: 0.12 },
  transporte_carga: { label: "Transporte de carga", irpj: 0.08, csll: 0.12 },
  transporte_outros: { label: "Transporte (exceto carga)", irpj: 0.16, csll: 0.12 },
  hospitalar: { label: "Serviços hospitalares/equiparados", irpj: 0.08, csll: 0.12 },
  servicos_gerais: { label: "Serviços em geral", irpj: 0.32, csll: 0.32 },
  intermediacao: { label: "Intermediação de negócios", irpj: 0.32, csll: 0.32 },
  locacao_adm: { label: "Administração/locação de bens", irpj: 0.32, csll: 0.32 },
  profissionais: { label: "Serviços profissionais regulamentados", irpj: 0.32, csll: 0.32 },
};

export const PISCOFINS_PRESUMIDO = { pis: 0.0065, cofins: 0.03 };
export const ENCARGOS_RATES = { inssPatronal: 0.2, terceiros: 0.058, rat: 0.02, fgts: 0.08 };
export const CBS_RATE = 0.0945;

export const REGIME_LABEL: Record<RegimeAtual, string> = {
  simples: "Simples Nacional",
  presumido: "Lucro Presumido",
  real: "Lucro Real",
};

/* ==================== Formatação ==================== */

export function fmtBRL(v: number): string {
  return (isNaN(v) ? 0 : v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtPct(v: number): string {
  return (isNaN(v) ? 0 : v).toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/* ==================== Helpers de array ==================== */

function novoMesArray(): number[] {
  return new Array(12).fill(0);
}

export function somarMeses(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

function randomId(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

/* ==================== Modelo: fábricas ==================== */

export function criarMesesVazios(): MesesDados {
  return {
    receitaComercio: novoMesArray(),
    receitaServico: novoMesArray(),
    receitaIntercompany: novoMesArray(),
    proLabore: novoMesArray(),
    bcInss: novoMesArray(),
    simplesApurado: novoMesArray(),
    inssPatronalManual: novoMesArray(),
    icmsDebito: novoMesArray(),
    icmsCredito: novoMesArray(),
    icmsEstoque: novoMesArray(),
    icmsTTDDebito: novoMesArray(),
    icmsTTDCredito: novoMesArray(),
    icmsTTDEstoque: novoMesArray(),
    issValor: novoMesArray(),
    fundos: novoMesArray(),
    ipiDebito: novoMesArray(),
    ipiCredito: novoMesArray(),
    pisDebito: novoMesArray(),
    pisCredito: novoMesArray(),
    pisEstoque: novoMesArray(),
    cofinsDebito: novoMesArray(),
    cofinsCredito: novoMesArray(),
    cofinsEstoque: novoMesArray(),
    lucroContabil: novoMesArray(),
    adicoes: novoMesArray(),
    exclusoes: novoMesArray(),
    irrf: novoMesArray(),
  };
}

export function novoGrupo(nome: string): Grupo {
  return {
    id: randomId("grp"),
    grupoNome: nome,
    grupoResponsavel: "",
    grupoData: "",
    anoSelecionado: new Date().getFullYear(),
    empresas: [],
  };
}

export function novaEmpresa(): Empresa {
  return {
    id: randomId("emp"),
    nome: "",
    cnpj: "",
    atividade: "servicos_gerais",
    regimeAtual: "simples",
    prejuizoInicial: 0,
    anos: {},
  };
}

export function obterMeses(empresa: Empresa, ano: number): MesesDados {
  return empresa.anos[ano] ?? criarMesesVazios();
}

export function getAnos(): number[] {
  const anoFinal = new Date().getFullYear() + 5;
  const anos: number[] = [];
  for (let a = ANO_INICIAL; a <= anoFinal; a++) anos.push(a);
  return anos;
}

export function anosComDados(grupo: Grupo): number[] {
  const anos = new Set<number>();
  grupo.empresas.forEach((emp) => {
    Object.entries(emp.anos).forEach(([anoStr, meses]) => {
      const temAlgo = Object.values(meses).some((arr) => arr.some((v) => v !== 0));
      if (temAlgo) anos.add(Number(anoStr));
    });
  });
  return Array.from(anos).sort((a, b) => a - b);
}

/* ==================== Persistência (localStorage) ==================== */

const STORAGE_KEY = "navecon_analise_tributaria_grupos_v2";

export function carregarGrupos(): Grupo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Grupo[];
  } catch {
    return [];
  }
}

export function salvarGrupos(grupos: Grupo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grupos));
  } catch {
    // localStorage indisponível — não é crítico
  }
}

/* ==================== Encargos de folha (GPS) ==================== */

export type GpsResult = {
  inssPatronal: number[];
  terceiros: number[];
  rat: number[];
  fgts: number[];
  feriasProv: number[];
  decimoProv: number[];
  inssProv: number[];
  fgtsProv: number[];
  totalMes: number[];
  total: number;
};

export function calcularGPS(meses: MesesDados): GpsResult {
  const inssPatronal = novoMesArray();
  const terceiros = novoMesArray();
  const rat = novoMesArray();
  const fgts = novoMesArray();
  const feriasProv = novoMesArray();
  const decimoProv = novoMesArray();
  const inssProv = novoMesArray();
  const fgtsProv = novoMesArray();
  const totalMes = novoMesArray();

  for (let i = 0; i < 12; i++) {
    const base = meses.bcInss[i] || 0;
    const pro = meses.proLabore[i] || 0;
    inssPatronal[i] = (pro + base) * ENCARGOS_RATES.inssPatronal;
    terceiros[i] = base * ENCARGOS_RATES.terceiros;
    rat[i] = base * ENCARGOS_RATES.rat;
    fgts[i] = base * ENCARGOS_RATES.fgts;
    feriasProv[i] = (base / 12) * (1 + 1 / 3);
    decimoProv[i] = base / 12;
    inssProv[i] = (feriasProv[i] + decimoProv[i]) * (ENCARGOS_RATES.inssPatronal + ENCARGOS_RATES.terceiros + ENCARGOS_RATES.rat);
    fgtsProv[i] = (feriasProv[i] + decimoProv[i]) * ENCARGOS_RATES.fgts;
    totalMes[i] = inssPatronal[i] + terceiros[i] + rat[i] + inssProv[i];
  }

  return { inssPatronal, terceiros, rat, fgts, feriasProv, decimoProv, inssProv, fgtsProv, totalMes, total: totalMes.reduce((a, b) => a + b, 0) };
}

export type EncargosResult = { totalMes: number[]; total: number; manual: boolean };

export function calcularEncargosFolha(empresa: Empresa, meses: MesesDados): EncargosResult {
  if (empresa.regimeAtual === "simples") {
    const gps = calcularGPS(meses);
    return { totalMes: gps.totalMes, total: gps.total, manual: false };
  }
  const totalMes = meses.inssPatronalManual.slice();
  return { totalMes, total: totalMes.reduce((a, b) => a + b, 0), manual: true };
}

/* ==================== Simples Nacional (valor apurado, informado direto) ==================== */

export function calcularSimples(meses: MesesDados): { porMes: number[]; total: number } {
  const porMes = meses.simplesApurado.slice();
  return { porMes, total: porMes.reduce((a, b) => a + b, 0) };
}

/* ==================== Lucro Presumido ==================== */

export type RegimeCalcResult = {
  irpj: number[];
  csll: number[];
  pis: number[];
  cofins: number[];
  icmsNormal: number[];
  icmsTTD: number[];
  iss: number[];
  fundos: number[];
  ipi: number[];
  inss: number[];
  totalMes: number[];
  total: number;
};

export function calcularPresumido(empresa: Empresa, meses: MesesDados, encargos: EncargosResult): RegimeCalcResult {
  const pComercio = PRESUNCAO.comercio_industria;
  const pServico = PRESUNCAO[empresa.atividade];

  const irpj = novoMesArray();
  const csll = novoMesArray();
  const pis = novoMesArray();
  const cofins = novoMesArray();
  const icmsNormal = novoMesArray();
  const icmsTTD = novoMesArray();
  const iss = novoMesArray();
  const fundos = novoMesArray();
  const ipi = novoMesArray();
  const inss = novoMesArray();
  const totalMes = novoMesArray();

  let saldoICMSAnterior = 0;

  for (let i = 0; i < 12; i++) {
    const receitaServicoTotal = meses.receitaServico[i] + meses.receitaIntercompany[i];
    const baseIrpj = meses.receitaComercio[i] * pComercio.irpj + receitaServicoTotal * pServico.irpj;
    const adicional = baseIrpj > 20000 ? (baseIrpj - 20000) * 0.1 : 0;
    irpj[i] = baseIrpj * 0.15 + adicional;

    const baseCsll = meses.receitaComercio[i] * pComercio.csll + receitaServicoTotal * pServico.csll;
    csll[i] = baseCsll * 0.09;

    const receitaTotalMes = meses.receitaComercio[i] + meses.receitaServico[i] + meses.receitaIntercompany[i];
    pis[i] = receitaTotalMes * PISCOFINS_PRESUMIDO.pis;
    cofins[i] = receitaTotalMes * PISCOFINS_PRESUMIDO.cofins;

    const saldoICMS = meses.icmsDebito[i] - meses.icmsCredito[i] - meses.icmsEstoque[i] + saldoICMSAnterior;
    icmsNormal[i] = Math.max(0, saldoICMS);
    saldoICMSAnterior = Math.min(0, saldoICMS);

    icmsTTD[i] = Math.max(0, meses.icmsTTDDebito[i] - meses.icmsTTDCredito[i]);
    iss[i] = meses.issValor[i];
    fundos[i] = meses.fundos[i];
    ipi[i] = Math.max(0, meses.ipiDebito[i] - meses.ipiCredito[i]);
    inss[i] = encargos.totalMes[i];

    totalMes[i] = irpj[i] + csll[i] + pis[i] + cofins[i] + icmsNormal[i] + icmsTTD[i] + iss[i] + fundos[i] + ipi[i] + inss[i];
  }

  return { irpj, csll, pis, cofins, icmsNormal, icmsTTD, iss, fundos, ipi, inss, totalMes, total: totalMes.reduce((a, b) => a + b, 0) };
}

/* ==================== Lucro Real ==================== */

export type RealCalcResult = RegimeCalcResult & {
  lucroMes: number[];
  compensacao: number[];
  baseAposCompMes: number[];
  baseCumulativa: number[];
  adicionalIrpjCum: number[];
  prejuizoSaldoFinal: number;
};

export function calcularReal(empresa: Empresa, meses: MesesDados, encargos: EncargosResult): RealCalcResult {
  const irpj = novoMesArray();
  const csll = novoMesArray();
  const pis = novoMesArray();
  const cofins = novoMesArray();
  const icmsNormal = novoMesArray();
  const icmsTTD = novoMesArray();
  const iss = novoMesArray();
  const fundos = novoMesArray();
  const ipi = novoMesArray();
  const inss = novoMesArray();
  const totalMes = novoMesArray();
  const lucroMes = novoMesArray();
  const compensacao = novoMesArray();
  const baseAposCompMes = novoMesArray();
  const baseCumulativa = novoMesArray();
  const adicionalIrpjCum = novoMesArray();

  let prejuizoAcum = empresa.prejuizoInicial || 0;
  let cumBase = 0;
  let cumIRRF = 0;
  let pagoIrpjCum = 0;
  let pagoCsllCum = 0;
  let saldoPisAnterior = 0;
  let saldoCofinsAnterior = 0;
  let saldoICMSAnterior = 0;
  let saldoTTDAnterior = 0;

  for (let i = 0; i < 12; i++) {
    const lm = meses.lucroContabil[i] + meses.adicoes[i] - meses.exclusoes[i];
    lucroMes[i] = lm;

    let comp = 0;
    let baseAposComp = 0;
    if (lm > 0) {
      comp = Math.min(prejuizoAcum, lm * 0.3);
      prejuizoAcum -= comp;
      baseAposComp = lm - comp;
    } else {
      prejuizoAcum += -lm;
    }
    compensacao[i] = comp;
    baseAposCompMes[i] = baseAposComp;

    cumBase += baseAposComp;
    cumIRRF += meses.irrf[i];
    baseCumulativa[i] = cumBase;

    const adicionalCum = Math.max(0, cumBase - 20000 * (i + 1)) * 0.1;
    adicionalIrpjCum[i] = adicionalCum;
    const irpjTotalCum = cumBase * 0.15 + adicionalCum - cumIRRF;
    const irpjMes = Math.max(0, irpjTotalCum - pagoIrpjCum);
    irpj[i] = irpjMes;
    pagoIrpjCum += irpjMes;

    const csllCum = cumBase * 0.09;
    const csllMes = Math.max(0, csllCum - pagoCsllCum);
    csll[i] = csllMes;
    pagoCsllCum += csllMes;

    const saldoPis = meses.pisDebito[i] - meses.pisCredito[i] - meses.pisEstoque[i] + saldoPisAnterior;
    pis[i] = Math.max(0, saldoPis);
    saldoPisAnterior = Math.min(0, saldoPis);

    const saldoCofins = meses.cofinsDebito[i] - meses.cofinsCredito[i] - meses.cofinsEstoque[i] + saldoCofinsAnterior;
    cofins[i] = Math.max(0, saldoCofins);
    saldoCofinsAnterior = Math.min(0, saldoCofins);

    const saldoICMS = meses.icmsDebito[i] - meses.icmsCredito[i] - meses.icmsEstoque[i] + saldoICMSAnterior;
    icmsNormal[i] = Math.max(0, saldoICMS);
    saldoICMSAnterior = Math.min(0, saldoICMS);

    const saldoTTD = meses.icmsTTDDebito[i] - meses.icmsTTDCredito[i] - meses.icmsTTDEstoque[i] + saldoTTDAnterior;
    icmsTTD[i] = Math.max(0, saldoTTD);
    saldoTTDAnterior = Math.min(0, saldoTTD);

    iss[i] = meses.issValor[i];
    fundos[i] = meses.fundos[i];
    ipi[i] = Math.max(0, meses.ipiDebito[i] - meses.ipiCredito[i]);
    inss[i] = encargos.totalMes[i];

    totalMes[i] = irpj[i] + csll[i] + pis[i] + cofins[i] + icmsNormal[i] + icmsTTD[i] + iss[i] + fundos[i] + ipi[i] + inss[i];
  }

  return {
    irpj,
    csll,
    pis,
    cofins,
    icmsNormal,
    icmsTTD,
    iss,
    fundos,
    ipi,
    inss,
    totalMes,
    total: totalMes.reduce((a, b) => a + b, 0),
    lucroMes,
    compensacao,
    baseAposCompMes,
    baseCumulativa,
    adicionalIrpjCum,
    prejuizoSaldoFinal: prejuizoAcum,
  };
}

/* ==================== Por empresa (agrega os 3 regimes) ==================== */

export type EmpresaCalcResult = {
  empresa: Empresa;
  meses: MesesDados;
  encargos: EncargosResult;
  simples: { porMes: number[]; total: number };
  presumido: RegimeCalcResult;
  real: RealCalcResult;
  receitaMes: number[];
  receitaTotal: number;
};

export function calcularEmpresa(empresa: Empresa, ano: number): EmpresaCalcResult {
  const meses = obterMeses(empresa, ano);
  const encargos = calcularEncargosFolha(empresa, meses);
  const simples = calcularSimples(meses);
  const presumido = calcularPresumido(empresa, meses, encargos);
  const real = calcularReal(empresa, meses, encargos);
  const receitaMes = meses.receitaComercio.map((v, i) => v + meses.receitaServico[i] + meses.receitaIntercompany[i]);
  return { empresa, meses, encargos, simples, presumido, real, receitaMes, receitaTotal: receitaMes.reduce((a, b) => a + b, 0) };
}

export function calcularIrpjCsllPresumidoGrupo(resultados: EmpresaCalcResult[]): { irpjGrupo: number[]; csllGrupo: number[] } {
  const irpjGrupo = novoMesArray();
  const csllGrupo = novoMesArray();
  for (let i = 0; i < 12; i++) {
    let baseIrpjMes = 0;
    let baseCsllMes = 0;
    resultados.forEach((r) => {
      const pComercio = PRESUNCAO.comercio_industria;
      const pServico = PRESUNCAO[r.empresa.atividade];
      const receitaServicoTotal = r.meses.receitaServico[i] + r.meses.receitaIntercompany[i];
      baseIrpjMes += r.meses.receitaComercio[i] * pComercio.irpj + receitaServicoTotal * pServico.irpj;
      baseCsllMes += r.meses.receitaComercio[i] * pComercio.csll + receitaServicoTotal * pServico.csll;
    });
    const adicional = baseIrpjMes > 20000 ? (baseIrpjMes - 20000) * 0.1 : 0;
    irpjGrupo[i] = baseIrpjMes * 0.15 + adicional;
    csllGrupo[i] = baseCsllMes * 0.09;
  }
  return { irpjGrupo, csllGrupo };
}

/* ==================== Cenários (4 composições agregadas do grupo) ==================== */

export type CenarioChave = "presumido_com_simples" | "presumido_sem_simples" | "real_com_simples" | "real_sem_simples";

export const LABELS_CENARIOS_PADRAO: Record<CenarioChave, string> = {
  presumido_com_simples: "Presumido com empresa no Simples",
  presumido_sem_simples: "Presumido sem empresa no Simples",
  real_com_simples: "Real com empresa no Simples",
  real_sem_simples: "Real sem empresa no Simples",
};

const LABELS_CENARIOS_SEM_SIMPLES: Partial<Record<CenarioChave, string>> = {
  presumido_sem_simples: "Lucro Presumido",
  real_sem_simples: "Lucro Real",
};

export type CenarioBreakdown = {
  irpj: number[];
  csll: number[];
  pis: number[];
  cofins: number[];
  icmsNormal: number[];
  icmsTTD: number[];
  iss: number[];
  fundos: number[];
  ipi: number[];
  inss: number[];
  simples: number[];
  totalMes: number[];
  total: number;
};

function montarCenario(resultados: EmpresaCalcResult[], chave: CenarioChave, irpjGrupo: number[], csllGrupo: number[]): CenarioBreakdown {
  const b: CenarioBreakdown = {
    irpj: novoMesArray(),
    csll: novoMesArray(),
    pis: novoMesArray(),
    cofins: novoMesArray(),
    icmsNormal: novoMesArray(),
    icmsTTD: novoMesArray(),
    iss: novoMesArray(),
    fundos: novoMesArray(),
    ipi: novoMesArray(),
    inss: novoMesArray(),
    simples: novoMesArray(),
    totalMes: novoMesArray(),
    total: 0,
  };

  const usaSimplesParaSimples = chave === "presumido_com_simples" || chave === "real_com_simples";
  const regimeHipotetico: "presumido" | "real" = chave.startsWith("presumido") ? "presumido" : "real";
  const consolidarGrupo = chave === "presumido_sem_simples";

  for (let i = 0; i < 12; i++) {
    if (consolidarGrupo) {
      b.irpj[i] = irpjGrupo[i];
      b.csll[i] = csllGrupo[i];
    }
    resultados.forEach((r) => {
      const isSimplesHoje = r.empresa.regimeAtual === "simples";
      if (usaSimplesParaSimples && isSimplesHoje) {
        b.simples[i] += r.simples.porMes[i];
        return;
      }
      const fonte = regimeHipotetico === "presumido" ? r.presumido : r.real;
      if (!consolidarGrupo) {
        b.irpj[i] += fonte.irpj[i];
        b.csll[i] += fonte.csll[i];
      }
      b.pis[i] += fonte.pis[i];
      b.cofins[i] += fonte.cofins[i];
      b.icmsNormal[i] += fonte.icmsNormal[i];
      b.icmsTTD[i] += fonte.icmsTTD[i];
      b.iss[i] += fonte.iss[i];
      b.fundos[i] += fonte.fundos[i];
      b.ipi[i] += fonte.ipi[i];
      b.inss[i] += fonte.inss[i];
    });
    b.totalMes[i] =
      b.irpj[i] + b.csll[i] + b.pis[i] + b.cofins[i] + b.icmsNormal[i] + b.icmsTTD[i] + b.iss[i] + b.fundos[i] + b.ipi[i] + b.inss[i] + b.simples[i];
  }
  b.total = b.totalMes.reduce((a, v) => a + v, 0);
  return b;
}

export type CenarioDetalhado = CenarioBreakdown & {
  chave: CenarioChave;
  label: string;
  porMes: number[];
  cbsPorMes: number[];
  cbsTotal: number;
};

export function detalharCenarios(resultados: EmpresaCalcResult[]): CenarioDetalhado[] {
  const { irpjGrupo, csllGrupo } = calcularIrpjCsllPresumidoGrupo(resultados);
  const temSimples = resultados.some((r) => r.empresa.regimeAtual === "simples");

  const faturamentoMes = novoMesArray();
  const intercompanyMes = novoMesArray();
  resultados.forEach((r) => {
    for (let i = 0; i < 12; i++) {
      faturamentoMes[i] += r.receitaMes[i];
      intercompanyMes[i] += r.meses.receitaIntercompany[i];
    }
  });

  const chaves: CenarioChave[] = temSimples
    ? ["presumido_com_simples", "presumido_sem_simples", "real_com_simples", "real_sem_simples"]
    : ["presumido_sem_simples", "real_sem_simples"];

  return chaves.map((chave) => {
    const b = montarCenario(resultados, chave, irpjGrupo, csllGrupo);
    const cbsPorMes = novoMesArray();
    for (let i = 0; i < 12; i++) {
      const baseCbs = temSimples ? faturamentoMes[i] - intercompanyMes[i] : faturamentoMes[i];
      const pisCofins = b.pis[i] + b.cofins[i];
      cbsPorMes[i] = b.totalMes[i] - pisCofins + baseCbs * CBS_RATE;
    }
    const label = temSimples ? LABELS_CENARIOS_PADRAO[chave] : (LABELS_CENARIOS_SEM_SIMPLES[chave] ?? LABELS_CENARIOS_PADRAO[chave]);
    return { ...b, chave, label, porMes: b.totalMes, cbsPorMes, cbsTotal: cbsPorMes.reduce((a, v) => a + v, 0) };
  });
}

export type CenariosResult = {
  cenarios: { chave: CenarioChave; label: string; porMes: number[]; total: number }[];
  detalhados: CenarioDetalhado[];
  faturamentoTotal: number;
  faturamentoAnual: number;
  melhorChave: CenarioChave;
  piorChave: CenarioChave;
  economia: number;
  economiaPerc: number;
  temSimples: boolean;
  chavesExibidas: CenarioChave[];
};

export function calcularCenarios(resultados: EmpresaCalcResult[]): CenariosResult {
  const detalhados = detalharCenarios(resultados);
  const faturamentoAnual = resultados.reduce((s, r) => s + r.receitaTotal, 0);

  let melhor = detalhados[0];
  let pior = detalhados[0];
  detalhados.forEach((c) => {
    if (c.total < melhor.total) melhor = c;
    if (c.total > pior.total) pior = c;
  });
  const economia = pior.total - melhor.total;
  const economiaPerc = pior.total > 0 ? economia / pior.total : 0;

  return {
    cenarios: detalhados.map(({ chave, label, porMes, total }) => ({ chave, label, porMes, total })),
    detalhados,
    faturamentoTotal: faturamentoAnual,
    faturamentoAnual,
    melhorChave: melhor.chave,
    piorChave: pior.chave,
    economia,
    economiaPerc,
    temSimples: resultados.some((r) => r.empresa.regimeAtual === "simples"),
    chavesExibidas: detalhados.map((d) => d.chave),
  };
}

export function processarAno(grupo: Grupo, ano: number): { resultados: EmpresaCalcResult[]; cenarios: CenariosResult } {
  const resultados = grupo.empresas.map((e) => calcularEmpresa(e, ano));
  const cenarios = calcularCenarios(resultados);
  return { resultados, cenarios };
}

/* ==================== Completude dos dados ==================== */

export function calcularCompletudeDados(grupo: Grupo, ano: number): { percReceita: number; detalhes: { nome: string; mesesComReceita: number }[] } {
  let totalMeses = 0;
  let mesesPreenchidos = 0;
  const detalhes = grupo.empresas.map((emp) => {
    const meses = obterMeses(emp, ano);
    const receitaMes = meses.receitaComercio.map((v, i) => v + meses.receitaServico[i] + meses.receitaIntercompany[i]);
    const mesesComReceita = receitaMes.filter((v) => v > 0).length;
    totalMeses += 12;
    mesesPreenchidos += mesesComReceita;
    return { nome: emp.nome, mesesComReceita };
  });
  const percReceita = totalMeses > 0 ? mesesPreenchidos / totalMeses : 0;
  return { percReceita, detalhes };
}

/* ==================== Campos das telas de "Dados Mensais" ==================== */

export type LinhaCampo = { key: keyof MesesDados; label: string; header?: string };

export const LINHAS: Record<string, LinhaCampo[]> = {
  fat: [
    { key: "receitaComercio", label: "Receita de Comércio" },
    { key: "receitaServico", label: "Receita de Serviço" },
    { key: "receitaIntercompany", label: "Receita Intercompany" },
  ],
  folha: [
    { key: "proLabore", label: "Pró-labore" },
    { key: "bcInss", label: "Base de Cálculo INSS" },
  ],
  simplesApuracao: [{ key: "simplesApurado", label: "Simples Apurado (DAS)" }],
  inssManual: [{ key: "inssPatronalManual", label: "INSS Patronal Apurado" }],
  impostos: [
    { key: "ipiDebito", label: "IPI — Débito", header: "IPI" },
    { key: "ipiCredito", label: "IPI — Crédito" },
    { key: "icmsDebito", label: "ICMS — Débito", header: "ICMS" },
    { key: "icmsCredito", label: "ICMS — Crédito" },
    { key: "icmsEstoque", label: "ICMS — Estoque" },
    { key: "icmsTTDDebito", label: "ICMS TTD — Débito", header: "ICMS TTD (guia própria)" },
    { key: "icmsTTDCredito", label: "ICMS TTD — Crédito" },
    { key: "icmsTTDEstoque", label: "ICMS TTD — Estoque" },
    { key: "issValor", label: "ISS", header: "ISS" },
    { key: "fundos", label: "Fundos Estaduais", header: "Fundos Estaduais" },
    { key: "pisDebito", label: "PIS — Débito", header: "PIS (não-cumulativo — só Lucro Real)" },
    { key: "pisCredito", label: "PIS — Crédito" },
    { key: "pisEstoque", label: "PIS — Estoque" },
    { key: "cofinsDebito", label: "COFINS — Débito", header: "COFINS (não-cumulativo — só Lucro Real)" },
    { key: "cofinsCredito", label: "COFINS — Crédito" },
    { key: "cofinsEstoque", label: "COFINS — Estoque" },
  ],
  lalur: [
    { key: "lucroContabil", label: "Lucro Contábil" },
    { key: "adicoes", label: "Adições" },
    { key: "exclusoes", label: "Exclusões" },
    { key: "irrf", label: "IRRF Retido" },
  ],
};

export const SUBTAB_LABELS: Record<string, string> = {
  fat: "Faturamento",
  folha: "Folha / GPS",
  simplesApuracao: "Apuração do Simples",
  inssManual: "INSS Patronal Apurado",
  impostos: "Impostos",
  lalur: "Lucro Real (LALUR)",
};

export function getSubtabKeys(regimeAtual: RegimeAtual): string[] {
  if (regimeAtual === "simples") return ["fat", "folha", "simplesApuracao"];
  return ["fat", "inssManual", "impostos", "lalur"];
}

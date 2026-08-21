import pptxgen from "pptxgenjs";
import { CATEGORIAS } from "@/components/tributaria/RelatorioConteudo";
import { CBS_RATE, type Grupo, MESES, anosComDados, fmtBRL, fmtPct, processarAno } from "@/lib/tributaria";

const COR = {
  ink: "1B2430",
  inkSoft: "57616F",
  paper: "EDF1EF",
  paperAlt: "FFFFFF",
  line: "D5DBD8",
  accent: "2B4C6F",
  accentSoft: "DCE6EE",
  brass: "8A6D3B",
  success: "1F7A5C",
};

const LARGURA = 13.33;
const MARGEM = 0.5;
const LARGURA_UTIL = LARGURA - MARGEM * 2;

function logoPath() {
  return typeof window !== "undefined" ? `${window.location.origin}/navecon-logo.png` : "/navecon-logo.png";
}

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

function criarApresentacao() {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Navecon Contabilidade e Assessoria";
  return pptx;
}

function celula(text: string, options: pptxgen.TableCellProps = {}): pptxgen.TableCell {
  return { text, options };
}

function adicionarCapa(pptx: pptxgen, { titulo, subtitulo, campos }: { titulo: string; subtitulo: string; campos: { label: string; valor: string }[] }) {
  const slide = pptx.addSlide();
  slide.background = { color: COR.paperAlt };
  slide.addImage({ path: logoPath(), x: 4.9, y: 1.1, w: 3.5, h: 0.66 });
  slide.addText(titulo, { x: MARGEM, y: 2.3, w: LARGURA_UTIL, h: 0.7, align: "center", fontFace: "Georgia", fontSize: 28, color: COR.ink, bold: true });
  slide.addText(subtitulo, { x: MARGEM, y: 3.0, w: LARGURA_UTIL, h: 0.4, align: "center", fontSize: 14, color: COR.inkSoft });
  slide.addText(
    campos.map((c, i) => ({ text: `${c.label}: ${c.valor}`, options: { breakLine: i < campos.length - 1 } })),
    { x: MARGEM, y: 3.9, w: LARGURA_UTIL, h: 1.4, align: "center", fontSize: 13, color: COR.ink, lineSpacingMultiple: 1.4, valign: "top" },
  );
  slide.addText("NAVECON CONTABILIDADE E ASSESSORIA", {
    x: MARGEM,
    y: 6.7,
    w: LARGURA_UTIL,
    h: 0.3,
    align: "center",
    fontSize: 10,
    color: COR.brass,
    bold: true,
    charSpacing: 2,
  });
  return slide;
}

function novoSlideBase(pptx: pptxgen, titulo: string, descricao?: string) {
  const slide = pptx.addSlide();
  slide.background = { color: COR.paperAlt };
  slide.addText(titulo, { x: MARGEM, y: 0.35, w: LARGURA_UTIL, h: 0.5, fontFace: "Georgia", fontSize: 20, color: COR.ink, bold: true });
  let y = 0.95;
  if (descricao) {
    slide.addText(descricao, { x: MARGEM, y, w: LARGURA_UTIL, h: 0.5, fontSize: 10.5, color: COR.inkSoft });
    y += 0.55;
  }
  return { slide, y };
}

function adicionarLinhaKpis(slide: pptxgen.Slide, kpis: { label: string; valor: string; sub?: string; destaque?: boolean }[], y: number) {
  const n = kpis.length;
  const gap = 0.2;
  const w = (LARGURA_UTIL - gap * (n - 1)) / n;
  kpis.forEach((k, i) => {
    const x = MARGEM + i * (w + gap);
    const runs: pptxgen.TextProps[] = [
      { text: k.label.toUpperCase(), options: { fontSize: 9, color: COR.inkSoft, breakLine: true } },
      { text: k.valor, options: { fontSize: 16, color: k.destaque ? COR.success : COR.ink, bold: true, breakLine: !!k.sub } },
    ];
    if (k.sub) runs.push({ text: k.sub, options: { fontSize: 8, color: COR.inkSoft } });
    slide.addText(runs, {
      x,
      y,
      w,
      h: 1.1,
      fill: { color: COR.paperAlt },
      line: { color: COR.line, width: 0.75 },
      rectRadius: 0.06,
      align: "left",
      valign: "middle",
      margin: 10,
    });
  });
}

function adicionarHero(slide: pptxgen.Slide, { label, valor, sub }: { label: string; valor: string; sub: string }, y: number) {
  slide.addText(
    [
      { text: label.toUpperCase(), options: { fontSize: 11, color: "FFFFFF", breakLine: true } },
      { text: valor, options: { fontSize: 34, color: "FFFFFF", bold: true, breakLine: true } },
      { text: sub, options: { fontSize: 10.5, color: "DCE6EE" } },
    ],
    { x: MARGEM, y, w: LARGURA_UTIL, h: 1.5, fill: { color: COR.accent }, rectRadius: 0.08, align: "center", valign: "middle" },
  );
}

function adicionarTabelaSlide(
  pptx: pptxgen,
  {
    titulo,
    descricao,
    headers,
    rows,
    colW,
    destaqueLinhas,
    fontSize = 10,
  }: {
    titulo: string;
    descricao?: string;
    headers: string[];
    rows: string[][];
    colW: number[];
    destaqueLinhas?: number[];
    fontSize?: number;
  },
) {
  const { slide, y } = novoSlideBase(pptx, titulo, descricao);
  const headerRow: pptxgen.TableRow = headers.map((h) =>
    celula(h, { bold: true, color: "FFFFFF", fill: { color: COR.accent }, fontSize, align: "center", valign: "middle" }),
  );
  const bodyRows: pptxgen.TableRow[] = rows.map((r, ri) => {
    const destaque = !!destaqueLinhas?.includes(ri);
    return r.map((texto, ci) =>
      celula(texto, {
        fontSize,
        color: COR.ink,
        align: ci === 0 ? "left" : "right",
        fill: { color: destaque ? COR.accentSoft : ri % 2 === 0 ? COR.paperAlt : COR.paper },
        bold: destaque,
      }),
    );
  });
  slide.addTable([headerRow, ...bodyRows], {
    x: MARGEM,
    y,
    w: LARGURA_UTIL,
    colW,
    border: { type: "solid", color: COR.line, pt: 0.5 },
    autoPage: false,
  });
}

export type GraficoCapturado = { titulo: string; dataUrl: string; aspecto: number; nota?: string };

function adicionarGraficoSlide(pptx: pptxgen, grafico: GraficoCapturado) {
  const { slide, y } = novoSlideBase(pptx, grafico.titulo);
  const alturaMax = 5.6;
  const larguraMax = 11.5;
  let w = larguraMax;
  let h = w / grafico.aspecto;
  if (h > alturaMax) {
    h = alturaMax;
    w = h * grafico.aspecto;
  }
  const x = (LARGURA - w) / 2;
  slide.addImage({ data: grafico.dataUrl, x, y: y + (alturaMax - h) / 2, w, h });
  if (grafico.nota) {
    slide.addText(grafico.nota, { x: MARGEM, y: y + alturaMax + 0.15, w: LARGURA_UTIL, h: 0.4, fontSize: 9.5, color: COR.inkSoft, align: "center" });
  }
}

function adicionarConteudoRelatorio(pptx: pptxgen, grupo: Grupo, ano: number) {
  const { cenarios } = processarAno(grupo, ano);
  const anosParaComparar = Array.from(new Set([...anosComDados(grupo), ano])).sort((a, b) => a - b);
  const comparativoAnual = anosParaComparar.map((a) => {
    const { resultados, cenarios: c } = processarAno(grupo, a);
    const melhor = c.cenarios.find((x) => x.chave === c.melhorChave)!;
    const faturamento = resultados.reduce((s, r) => s + r.receitaTotal, 0);
    return { ano: a, melhorLabel: melhor.label, melhorTotal: melhor.total, pctFaturamento: faturamento > 0 ? melhor.total / faturamento : 0 };
  });
  const melhorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.melhorChave)!;
  const piorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.piorChave)!;

  {
    const { slide, y } = novoSlideBase(pptx, "Resumo Executivo");
    adicionarLinhaKpis(
      slide,
      [
        { label: "Melhor Opção", valor: melhorCenario.label, destaque: true },
        { label: "Carga Tributária do Melhor Cenário", valor: fmtBRL(melhorCenario.total) },
        { label: "Economia vs. Pior Cenário", valor: fmtBRL(cenarios.economia), sub: `${fmtPct(cenarios.economiaPerc)} mais barato que ${piorCenario.label}` },
        { label: "Faturamento Consolidado", valor: fmtBRL(cenarios.faturamentoAnual) },
      ],
      y + 0.3,
    );
  }

  adicionarTabelaSlide(pptx, {
    titulo: "Comparativo Consolidado — Cenários",
    headers: ["Cenário", "Total Anual", "% sobre Faturamento"],
    rows: cenarios.cenarios.map((c) => [
      c.label + (c.chave === cenarios.melhorChave ? " (Recomendado)" : ""),
      fmtBRL(c.total),
      cenarios.faturamentoAnual > 0 ? fmtPct(c.total / cenarios.faturamentoAnual) : "—",
    ]),
    colW: [6, 3.66, 2.67],
    destaqueLinhas: [cenarios.cenarios.findIndex((c) => c.chave === cenarios.melhorChave)],
  });

  adicionarTabelaSlide(pptx, {
    titulo: "Comparativo Pós-Reforma — Carga Atual × Carga com CBS",
    descricao: `Aplica o débito de CBS projetado (${fmtPct(CBS_RATE)}) sobre cada cenário exibido, pra dimensionar o impacto da transição.`,
    headers: ["Cenário", "Carga Atual", "CBS Projetado", "Carga Total (Transição)", "Variação"],
    rows: cenarios.detalhados.map((d) => {
      const pisCofinsTotal = d.pis.reduce((a, v) => a + v, 0) + d.cofins.reduce((a, v) => a + v, 0);
      const cargaTotalTransicao = d.cbsTotal;
      const cbsProjetado = cargaTotalTransicao - (d.total - pisCofinsTotal);
      const variacao = d.total > 0 ? (cargaTotalTransicao - d.total) / d.total : 0;
      return [d.label, fmtBRL(d.total), fmtBRL(cbsProjetado), fmtBRL(cargaTotalTransicao), fmtPct(variacao)];
    }),
    colW: [3.5, 2.2, 2.2, 2.63, 1.8],
  });

  adicionarTabelaSlide(pptx, {
    titulo: "Comparativo Anual entre Regimes",
    headers: ["Ano", "Melhor Cenário", "Carga Tributária", "% sobre Faturamento"],
    rows: comparativoAnual.map((row) => [String(row.ano), row.melhorLabel, fmtBRL(row.melhorTotal), fmtPct(row.pctFaturamento)]),
    colW: [1.83, 4.5, 3.5, 2.5],
    destaqueLinhas: [comparativoAnual.findIndex((r) => r.ano === ano)],
  });

  cenarios.detalhados.forEach((d) => {
    const linhasCategorias = CATEGORIAS.filter((cat) => d[cat.key].reduce((a, v) => a + v, 0) !== 0);
    const rows = [
      ...linhasCategorias.map((cat) => {
        const arr = d[cat.key];
        return [cat.label, ...arr.map((v) => fmtBRL(v)), fmtBRL(arr.reduce((a, v) => a + v, 0))];
      }),
      ["Total do Cenário", ...d.totalMes.map((v) => fmtBRL(v)), fmtBRL(d.total)],
      ["Débito de CBS projetado", ...d.cbsPorMes.map((v) => fmtBRL(v)), fmtBRL(d.cbsTotal)],
    ];
    adicionarTabelaSlide(pptx, {
      titulo: `Detalhamento Mensal — ${d.label}${d.chave === cenarios.melhorChave ? " (Recomendado)" : ""}`,
      headers: ["Tributo", ...MESES, "Total"],
      rows,
      colW: [1.7, ...Array(12).fill((LARGURA_UTIL - 1.7 - 0.83) / 12), 0.83],
      destaqueLinhas: [rows.length - 2, rows.length - 1],
      fontSize: 7.5,
    });
  });
}

export async function gerarPptxRelatorio(grupo: Grupo, ano: number): Promise<void> {
  const pptx = criarApresentacao();
  adicionarCapa(pptx, {
    titulo: "Relatório de Análise Tributária",
    subtitulo: "Comparativo entre regimes tributários",
    campos: [
      { label: "Grupo", valor: grupo.grupoNome },
      { label: "Ano-base", valor: String(ano) },
      { label: "Responsável", valor: grupo.grupoResponsavel || "—" },
    ],
  });
  adicionarConteudoRelatorio(pptx, grupo, ano);
  await pptx.writeFile({ fileName: `relatorio_${slug(grupo.grupoNome)}_${ano}.pptx` });
}

export async function gerarPptxDashboard(grupo: Grupo, ano: number, nomeCliente: string, graficos: GraficoCapturado[]): Promise<void> {
  const pptx = criarApresentacao();
  const { cenarios } = processarAno(grupo, ano);
  const melhorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.melhorChave)!;

  adicionarCapa(pptx, {
    titulo: "Dashboard de Apresentação ao Cliente",
    subtitulo: "Análise Tributária Comparativa",
    campos: [
      { label: "Cliente", valor: nomeCliente || grupo.grupoNome },
      { label: "Ano-base", valor: String(ano) },
    ],
  });

  {
    const { slide, y } = novoSlideBase(pptx, "Panorama Geral");
    adicionarHero(
      slide,
      {
        label: "Economia tributária estimada",
        valor: fmtBRL(cenarios.economia),
        sub: `Optando por ${melhorCenario.label} em vez do cenário mais custoso — ${fmtPct(cenarios.economiaPerc)} de redução na carga tributária`,
      },
      y,
    );
    adicionarLinhaKpis(
      slide,
      [
        { label: "Cenário Recomendado", valor: melhorCenario.label, destaque: true },
        { label: "Carga Tributária Anual", valor: fmtBRL(melhorCenario.total) },
        { label: "% sobre Faturamento", valor: cenarios.faturamentoAnual > 0 ? fmtPct(melhorCenario.total / cenarios.faturamentoAnual) : "—" },
        { label: "Faturamento Consolidado", valor: fmtBRL(cenarios.faturamentoAnual) },
      ],
      y + 1.8,
    );
  }

  for (const grafico of graficos) {
    adicionarGraficoSlide(pptx, grafico);
  }

  adicionarConteudoRelatorio(pptx, grupo, ano);
  await pptx.writeFile({ fileName: `dashboard_${slug(nomeCliente || grupo.grupoNome)}_${ano}.pptx` });
}

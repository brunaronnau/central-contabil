import pptxgen from "pptxgenjs";
import { CATEGORIAS } from "@/components/tributaria/RelatorioConteudo";
import { CBS_RATE, type Grupo, MESES, anosComDados, fmtBRL, fmtPct, processarAno } from "@/lib/tributaria";

// Identidade visual Navecon: fundo escuro (igual à barra lateral do sistema)
// com dourado como cor de destaque — o mesmo par de cores da logo (dourado +
// prata metálico sobre fundo escuro).
const COR = {
  fundo: "141B24",
  painel: "1F2833",
  painel2: "26313F",
  linha: "3A4553",
  ouro: "D4AF6A",
  tinta: "1B2430",
  branco: "FFFFFF",
  textoMuted: "9AA5B1",
  sucesso: "3DBE8B",
  papel: "FFFFFF",
};

const FONTE_TITULO = "Georgia";
const FONTE_TEXTO = "Calibri";

const LARGURA = 13.33;
const ALTURA = 7.5;
const MARGEM = 0.55;
const LARGURA_UTIL = LARGURA - MARGEM * 2;
const MASTER_CAPA = "NAVECON_CAPA";
const MASTER_CONTEUDO = "NAVECON_CONTEUDO";

function logoPath() {
  return typeof window !== "undefined" ? `${window.location.origin}/navecon-logo.png` : "/navecon-logo.png";
}

function slug(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
}

function definirMestres(pptx: pptxgen) {
  pptx.defineSlideMaster({
    title: MASTER_CAPA,
    background: { color: COR.fundo },
  });

  pptx.defineSlideMaster({
    title: MASTER_CONTEUDO,
    background: { color: COR.fundo },
    objects: [
      { line: { x: MARGEM, y: 1.18, w: LARGURA_UTIL, h: 0, line: { color: COR.ouro, width: 1.5 } } },
      { image: { path: logoPath(), x: LARGURA - MARGEM - 1.7, y: 0.32, w: 1.7, h: 0.32 } },
      { line: { x: MARGEM, y: 6.92, w: LARGURA_UTIL, h: 0, line: { color: COR.linha, width: 0.75 } } },
      {
        text: {
          text: "NAVECON CONTABILIDADE E ASSESSORIA",
          options: { x: MARGEM, y: 7.02, w: 9, h: 0.3, fontFace: FONTE_TEXTO, fontSize: 8, color: COR.ouro, charSpacing: 1 },
        },
      },
    ],
    slideNumber: { x: LARGURA - MARGEM - 0.6, y: 7.02, w: 0.6, h: 0.3, fontFace: FONTE_TEXTO, fontSize: 8, color: COR.textoMuted, align: "right" },
  });
}

function criarApresentacao() {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Navecon Contabilidade e Assessoria";
  pptx.company = "Navecon Contabilidade e Assessoria";
  definirMestres(pptx);
  return pptx;
}

function celula(text: string, options: pptxgen.TableCellProps = {}): pptxgen.TableCell {
  return { text, options };
}

// Caixa retangular (com preenchimento/borda/cantos arredondados) usando um
// addText vazio — evita depender da API de shapes, já testada e estável aqui.
function caixa(slide: pptxgen.Slide, opts: pptxgen.TextPropsOptions) {
  slide.addText("", opts);
}

function adicionarCapa(
  pptx: pptxgen,
  { titulo, subtitulo, campos }: { titulo: string; subtitulo: string; campos: { label: string; valor: string }[] },
) {
  const slide = pptx.addSlide({ masterName: MASTER_CAPA });
  slide.addImage({ path: logoPath(), x: (LARGURA - 5) / 2, y: 1.3, w: 5, h: 0.94 });
  caixa(slide, { x: (LARGURA - 1.2) / 2, y: 2.55, w: 1.2, h: 0, line: { color: COR.ouro, width: 1.5 } });
  slide.addText(titulo, { x: MARGEM, y: 2.85, w: LARGURA_UTIL, h: 0.7, align: "center", fontFace: FONTE_TITULO, fontSize: 30, color: COR.branco, bold: true });
  slide.addText(subtitulo, { x: MARGEM, y: 3.55, w: LARGURA_UTIL, h: 0.4, align: "center", fontFace: FONTE_TEXTO, fontSize: 14, color: COR.ouro });
  slide.addText(
    campos.flatMap((c, i) => [
      { text: `${c.label.toUpperCase()}:  `, options: { color: COR.textoMuted, breakLine: false } },
      { text: c.valor, options: { color: COR.branco, bold: true, breakLine: i < campos.length - 1 } },
    ]),
    { x: MARGEM, y: 4.4, w: LARGURA_UTIL, h: 1.4, align: "center", fontFace: FONTE_TEXTO, fontSize: 13, lineSpacingMultiple: 1.6, valign: "top" },
  );
  slide.addText("NAVECON CONTABILIDADE E ASSESSORIA", {
    x: MARGEM,
    y: ALTURA - 0.7,
    w: LARGURA_UTIL,
    h: 0.3,
    align: "center",
    fontFace: FONTE_TEXTO,
    fontSize: 9.5,
    color: COR.ouro,
    bold: true,
    charSpacing: 2,
  });
  return slide;
}

function adicionarDivisor(pptx: pptxgen, titulo: string, sub?: string) {
  const slide = pptx.addSlide({ masterName: MASTER_CAPA });
  caixa(slide, { x: (LARGURA - 0.9) / 2, y: 3.15, w: 0.9, h: 0, line: { color: COR.ouro, width: 1.5 } });
  slide.addText(titulo, { x: MARGEM, y: 3.4, w: LARGURA_UTIL, h: 0.7, align: "center", fontFace: FONTE_TITULO, fontSize: 26, color: COR.branco, bold: true });
  if (sub) slide.addText(sub, { x: MARGEM, y: 4.05, w: LARGURA_UTIL, h: 0.4, align: "center", fontFace: FONTE_TEXTO, fontSize: 13, color: COR.ouro });
}

function adicionarFechamento(pptx: pptxgen) {
  const slide = pptx.addSlide({ masterName: MASTER_CAPA });
  slide.addImage({ path: logoPath(), x: (LARGURA - 4) / 2, y: 2.5, w: 4, h: 0.75 });
  slide.addText("Obrigado pela confiança.", {
    x: MARGEM,
    y: 3.7,
    w: LARGURA_UTIL,
    h: 0.6,
    align: "center",
    fontFace: FONTE_TITULO,
    fontSize: 22,
    color: COR.ouro,
    italic: true,
  });
  slide.addText("Navecon Contabilidade e Assessoria  ·  CRCSC-011054/O", {
    x: MARGEM,
    y: ALTURA - 0.9,
    w: LARGURA_UTIL,
    h: 0.3,
    align: "center",
    fontFace: FONTE_TEXTO,
    fontSize: 10,
    color: COR.textoMuted,
  });
}

function novoSlideConteudo(pptx: pptxgen, titulo: string, descricao?: string) {
  const slide = pptx.addSlide({ masterName: MASTER_CONTEUDO });
  slide.addText(titulo, { x: MARGEM, y: 0.35, w: 9.5, h: 0.6, fontFace: FONTE_TITULO, fontSize: 21, color: COR.branco, bold: true });
  let y = 1.4;
  if (descricao) {
    slide.addText(descricao, { x: MARGEM, y, w: LARGURA_UTIL, h: 0.5, fontFace: FONTE_TEXTO, fontSize: 10.5, color: COR.textoMuted });
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
    const corTexto = k.destaque ? COR.tinta : COR.branco;
    const runs: pptxgen.TextProps[] = [
      { text: k.label.toUpperCase(), options: { fontSize: 9, color: k.destaque ? COR.tinta : COR.textoMuted, breakLine: true } },
      { text: k.valor, options: { fontSize: 16, color: corTexto, bold: true, breakLine: !!k.sub } },
    ];
    if (k.sub) runs.push({ text: k.sub, options: { fontSize: 8, color: k.destaque ? COR.tinta : COR.textoMuted } });
    slide.addText(runs, {
      x,
      y,
      w,
      h: 1.15,
      fontFace: FONTE_TEXTO,
      fill: { color: k.destaque ? COR.ouro : COR.painel },
      line: { color: k.destaque ? COR.ouro : COR.linha, width: 1 },
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
      { text: label.toUpperCase(), options: { fontSize: 11, color: COR.tinta, breakLine: true, charSpacing: 1 } },
      { text: valor, options: { fontSize: 36, color: COR.tinta, bold: true, breakLine: true } },
      { text: sub, options: { fontSize: 10.5, color: COR.tinta } },
    ],
    { x: MARGEM, y, w: LARGURA_UTIL, h: 1.55, fontFace: FONTE_TEXTO, fill: { color: COR.ouro }, rectRadius: 0.08, align: "center", valign: "middle" },
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
  const { slide, y } = novoSlideConteudo(pptx, titulo, descricao);
  const headerRow: pptxgen.TableRow = headers.map((h) =>
    celula(h, { bold: true, color: COR.tinta, fill: { color: COR.ouro }, fontSize, fontFace: FONTE_TEXTO, align: "center", valign: "middle" }),
  );
  const bodyRows: pptxgen.TableRow[] = rows.map((r, ri) => {
    const destaque = !!destaqueLinhas?.includes(ri);
    return r.map((texto, ci) =>
      celula(texto, {
        fontSize,
        fontFace: FONTE_TEXTO,
        color: destaque ? COR.ouro : COR.branco,
        align: ci === 0 ? "left" : "right",
        fill: { color: destaque ? "3A2F17" : ri % 2 === 0 ? COR.painel : COR.painel2 },
        bold: destaque,
      }),
    );
  });
  slide.addTable([headerRow, ...bodyRows], {
    x: MARGEM,
    y,
    w: LARGURA_UTIL,
    colW,
    border: { type: "solid", color: COR.linha, pt: 0.5 },
    autoPage: false,
  });
}

export type GraficoCapturado = { titulo: string; dataUrl: string; aspecto: number; nota?: string };

function adicionarGraficoSlide(pptx: pptxgen, grafico: GraficoCapturado) {
  const { slide, y } = novoSlideConteudo(pptx, grafico.titulo);
  const alturaMax = 5.15;
  const larguraMax = 11.2;
  let w = larguraMax;
  let h = w / grafico.aspecto;
  if (h > alturaMax) {
    h = alturaMax;
    w = h * grafico.aspecto;
  }
  const padding = 0.25;
  const boxW = w + padding * 2;
  const boxH = h + padding * 2;
  const boxX = (LARGURA - boxW) / 2;
  const boxY = y + (alturaMax + padding * 2 - boxH) / 2;

  // Os gráficos são desenhados em canvas com fundo claro — emoldura numa
  // "cartela" branca pra não parecer um retângulo branco solto no fundo escuro.
  caixa(slide, { x: boxX, y: boxY, w: boxW, h: boxH, fill: { color: COR.papel }, rectRadius: 0.06 });
  slide.addImage({ data: grafico.dataUrl, x: boxX + padding, y: boxY + padding, w, h });

  if (grafico.nota) {
    slide.addText(grafico.nota, {
      x: MARGEM,
      y: boxY + boxH + 0.12,
      w: LARGURA_UTIL,
      h: 0.35,
      fontFace: FONTE_TEXTO,
      fontSize: 9.5,
      color: COR.textoMuted,
      align: "center",
    });
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
    const { slide, y } = novoSlideConteudo(pptx, "Resumo Executivo");
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

  adicionarDivisor(pptx, "Análise Detalhada", "Detalhamento mensal por cenário simulado");

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
  adicionarFechamento(pptx);
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
    const { slide, y } = novoSlideConteudo(pptx, "Panorama Geral");
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
      y + 1.85,
    );
  }

  if (graficos.length > 0) {
    adicionarDivisor(pptx, "Evolução e Comparativos", "Visão gráfica da carga tributária ao longo do tempo");
    for (const grafico of graficos) {
      adicionarGraficoSlide(pptx, grafico);
    }
  }

  adicionarConteudoRelatorio(pptx, grupo, ano);
  adicionarFechamento(pptx);
  await pptx.writeFile({ fileName: `dashboard_${slug(nomeCliente || grupo.grupoNome)}_${ano}.pptx` });
}

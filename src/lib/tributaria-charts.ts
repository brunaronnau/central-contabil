export { drawLineChart } from "@/lib/entregas-charts";

// Largura máxima de cada coluna — sem isso, com poucas categorias (ex.: só
// Simples/Presumido/Real) a barra ocupa quase toda a largura do gráfico e
// fica com aparência grosseira. Com o teto, as colunas ficam centralizadas
// e num tamanho equilibrado (nem muito largas, nem finas demais).
const LARGURA_MAX_BARRA = 64;
const LARGURA_MAX_GRUPO_BARRAS = 90;

function prepararCanvas(canvas: HTMLCanvasElement, hCss: number) {
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement!;
  const w = Math.max(parent.clientWidth - 4, 100);
  canvas.style.width = w + "px";
  canvas.style.height = hCss + "px";
  canvas.width = w * dpr;
  canvas.height = hCss * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hCss);
  return { ctx, w, h: hCss };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  words.forEach((word) => {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

export function drawBarChart(canvas: HTMLCanvasElement, labels: string[], values: number[], colors: string[], hCss: number) {
  const { ctx, w, h } = prepararCanvas(canvas, hCss);
  const padding = { top: 24, right: 16, bottom: 56, left: 44 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const maxVal = Math.max(...values, 1);
  const ySteps = 4;

  ctx.strokeStyle = "#E3E6EB";
  ctx.lineWidth = 1;
  ctx.font = '11px "IBM Plex Sans"';
  ctx.fillStyle = "#8695AA";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= ySteps; i++) {
    const val = (maxVal / ySteps) * i;
    const y = padding.top + chartH - (chartH / ySteps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
    ctx.fillText(val.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 }), padding.left - 8, y);
  }

  const n = Math.max(labels.length, 1);
  const gap = 22;
  const barW = Math.min((chartW - gap * (n - 1)) / n, LARGURA_MAX_BARRA);
  const larguraTotal = n * barW + gap * (n - 1);
  const inicioX = padding.left + (chartW - larguraTotal) / 2;

  labels.forEach((label, i) => {
    const val = values[i] ?? 0;
    const barH = Math.max((val / maxVal) * chartH, 1);
    const barX = inicioX + i * (barW + gap);
    const barY = padding.top + chartH - barH;
    ctx.fillStyle = colors[i] ?? "#4A5B74";
    roundRect(ctx, barX, barY, barW, barH, 4);

    ctx.fillStyle = "#1B2430";
    ctx.font = '11px "IBM Plex Mono"';
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }),
      barX + barW / 2,
      barY - 6,
    );

    ctx.fillStyle = "#4A5B74";
    ctx.font = '10.5px "IBM Plex Sans"';
    wrapText(ctx, label, barX + barW / 2, padding.top + chartH + 16, barW + gap - 4, 12);
  });
}

// Cópia local de drawGroupedBarChart (entregas-charts.ts) só com o teto de
// largura do grupo de colunas — mantém o gráfico de Entregas intocado.
export function drawGroupedBarChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  series: { name: string; color: string; data: number[] }[],
  hCss: number,
) {
  const { ctx, w, h } = prepararCanvas(canvas, hCss);
  const padding = { top: 44, right: 16, bottom: 56, left: 44 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const allVals = series.flatMap((s) => s.data);
  const maxVal = Math.max(...allVals, 1);
  const ySteps = 4;

  ctx.strokeStyle = "#E3E6EB";
  ctx.lineWidth = 1;
  ctx.font = '11px "IBM Plex Sans"';
  ctx.fillStyle = "#8695AA";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= ySteps; i++) {
    const val = (maxVal / ySteps) * i;
    const y = padding.top + chartH - (chartH / ySteps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(val)), padding.left - 8, y);
  }

  const n = Math.max(labels.length, 1);
  const groupGap = 22;
  const groupW = Math.min((chartW - groupGap * (n - 1)) / n, LARGURA_MAX_GRUPO_BARRAS);
  const larguraTotal = n * groupW + groupGap * (n - 1);
  const inicioX = padding.left + (chartW - larguraTotal) / 2;
  const barGap = 3;
  const barW = (groupW - barGap * (series.length - 1)) / series.length;

  labels.forEach((label, gi) => {
    const groupX = inicioX + gi * (groupW + groupGap);
    series.forEach((s, si) => {
      const val = s.data[gi] ?? 0;
      const barH = Math.max((val / maxVal) * chartH, 1);
      const barX = groupX + si * (barW + barGap);
      const barY = padding.top + chartH - barH;
      ctx.fillStyle = s.color;
      roundRect(ctx, barX, barY, barW, barH, 3);
    });

    ctx.fillStyle = "#4A5B74";
    ctx.font = '10.5px "IBM Plex Sans"';
    ctx.textBaseline = "alphabetic";
    wrapText(ctx, label, groupX + groupW / 2, padding.top + chartH + 16, groupW + groupGap - 4, 12);
  });

  let lx = padding.left;
  const ly1 = 10;
  const ly2 = 19;
  ctx.textAlign = "left";
  ctx.font = '11px "IBM Plex Sans"';
  series.forEach((s) => {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, ly1, 10, 10);
    ctx.fillStyle = "#4A5B74";
    ctx.fillText(s.name, lx + 14, ly2);
    lx += ctx.measureText(s.name).width + 34;
  });
}

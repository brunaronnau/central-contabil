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

export function drawLineChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  series: { data: number[]; color: string }[],
  hCss: number,
  formatter: (v: number) => string,
) {
  const { ctx, w, h } = prepararCanvas(canvas, hCss);
  const padding = { top: 34, right: 16, bottom: 34, left: 50 };
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
    ctx.fillText(formatter(val), padding.left - 8, y);
  }

  const stepX = chartW / Math.max(labels.length - 1, 1);

  series.forEach((s) => {
    const points = s.data.map((v, i) => ({
      x: padding.left + stepX * i,
      y: padding.top + chartH - (v / maxVal) * chartH,
    }));

    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.lineTo(points[0].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = s.color + "22";
    ctx.fill();

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
    });
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#4A5B74";
  ctx.font = '10.5px "IBM Plex Sans"';
  labels.forEach((label, i) => {
    const x = padding.left + stepX * i;
    ctx.fillText(label, x, h - 12);
  });
}

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
  const groupW = (chartW - groupGap * (n - 1)) / n;
  const barGap = 3;
  const barW = (groupW - barGap * (series.length - 1)) / series.length;

  labels.forEach((label, gi) => {
    const groupX = padding.left + gi * (groupW + groupGap);
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

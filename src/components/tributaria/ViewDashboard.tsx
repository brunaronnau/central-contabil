"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Grupo, anosComDados, calcularCompletudeDados, fmtBRL, fmtPct, getAnos, processarAno } from "@/lib/tributaria";
import { drawBarChart } from "@/lib/tributaria-charts";
import { drawGroupedBarChart, drawLineChart } from "@/lib/entregas-charts";
import type { ViewKey } from "./TributariaClient";

export function ViewDashboard({
  grupo,
  ano,
  onAno,
  apresentacao,
  onToggleApresentacao,
  onIrPara,
}: {
  grupo: Grupo;
  ano: number;
  onAno: (a: number) => void;
  apresentacao: boolean;
  onToggleApresentacao: () => void;
  onIrPara: (v: ViewKey) => void;
}) {
  const [dashClient, setDashClient] = useState(grupo.grupoNome);

  const chartCenariosRef = useRef<HTMLCanvasElement>(null);
  const chartReformaRef = useRef<HTMLCanvasElement>(null);
  const chartMensalRef = useRef<HTMLCanvasElement>(null);
  const chartAnualRef = useRef<HTMLCanvasElement>(null);

  const { cenarios } = useMemo(() => processarAno(grupo, ano), [grupo, ano]);
  const completude = useMemo(() => calcularCompletudeDados(grupo, ano), [grupo, ano]);

  const anosParaComparar = useMemo(() => {
    const anos = new Set(anosComDados(grupo));
    anos.add(ano);
    return Array.from(anos).sort((a, b) => a - b);
  }, [grupo, ano]);

  const melhorAnual = useMemo(
    () =>
      anosParaComparar.map((a) => {
        const { cenarios: c } = processarAno(grupo, a);
        return { ano: a, total: c.cenarios.find((x) => x.chave === c.melhorChave)?.total ?? 0 };
      }),
    [grupo, anosParaComparar],
  );

  useEffect(() => {
    if (grupo.empresas.length === 0) return;
    if (chartCenariosRef.current) {
      const melhorChave = cenarios.melhorChave;
      drawBarChart(
        chartCenariosRef.current,
        cenarios.cenarios.map((c) => c.label),
        cenarios.cenarios.map((c) => c.total),
        cenarios.cenarios.map((c) => (c.chave === melhorChave ? "#1E8A5F" : "#4A5B74")),
        280,
      );
    }
    if (chartReformaRef.current) {
      drawGroupedBarChart(
        chartReformaRef.current,
        cenarios.detalhados.map((d) => d.label),
        [
          { name: "Carga Atual", color: "#4A5B74", data: cenarios.detalhados.map((d) => d.total) },
          { name: "Carga com CBS", color: "#C9A227", data: cenarios.detalhados.map((d) => d.cbsTotal) },
        ],
        280,
      );
    }
    if (chartMensalRef.current) {
      const melhor = cenarios.detalhados.find((d) => d.chave === cenarios.melhorChave)!;
      const pior = cenarios.detalhados.find((d) => d.chave === cenarios.piorChave)!;
      drawLineChart(
        chartMensalRef.current,
        ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
        [
          { data: melhor.totalMes.map((v) => Math.round(v)), color: "#1E8A5F" },
          { data: pior.totalMes.map((v) => Math.round(v)), color: "#B23B3B" },
        ],
        280,
        (v) => fmtBRL(v),
      );
    }
    if (chartAnualRef.current) {
      drawLineChart(
        chartAnualRef.current,
        melhorAnual.map((r) => String(r.ano)),
        [{ data: melhorAnual.map((r) => Math.round(r.total)), color: "#C9A227" }],
        260,
        (v) => fmtBRL(v),
      );
    }
  }, [cenarios, melhorAnual, grupo.empresas.length]);

  if (grupo.empresas.length === 0) {
    return (
      <section className="at-view active">
        <div className="empty-state">Cadastre empresas e preencha dados mensais antes de gerar o dashboard.</div>
        <div className="btn-row no-print">
          <button className="btn secondary" onClick={() => onIrPara("relatorio")}>
            ← Anterior
          </button>
        </div>
      </section>
    );
  }

  const melhorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.melhorChave)!;
  const completudeClasse = completude.percReceita >= 0.999 ? "good" : completude.percReceita >= 0.75 ? "gold" : "danger";
  const incompletas = completude.detalhes.filter((d) => d.mesesComReceita < 12);

  return (
    <section className="at-view active">
      <div className="print-cover print-only">
        <span className="eyebrow">CENTRAL CONTÁBIL · NAVECON</span>
        <h1>Dashboard de Apresentação ao Cliente</h1>
        <p className="sub">Análise Tributária Comparativa</p>
        <p className="campo">
          <b>Cliente:</b> {dashClient || grupo.grupoNome}
        </p>
        <p className="campo">
          <b>Ano-base:</b> {ano}
        </p>
        <span className="selo">Navecon Contabilidade e Assessoria</span>
      </div>
      <div className="print-footer print-only">
        <span>Navecon Contabilidade e Assessoria — Documento Confidencial</span>
        <span>
          {grupo.grupoNome} · Ano-base {ano}
        </span>
      </div>

      <div className="dashboard-header">
        <div>
          <h2>
            <input
              value={dashClient}
              onChange={(e) => setDashClient(e.target.value)}
              className="no-print"
              style={{ background: "transparent", border: "none", color: "#fff", fontFamily: "var(--serif)", fontSize: 20, padding: 0 }}
            />
            <span className="print-only">{dashClient || grupo.grupoNome}</span>
          </h2>
          <div className="sub">{new Date().toLocaleDateString("pt-BR")}</div>
        </div>
        <div className="btn-row no-print" style={{ marginTop: 0 }}>
          <label className="small-note" style={{ color: "#c7ccd4" }}>
            Ano{" "}
            <select style={{ width: "auto", display: "inline-block" }} value={ano} onChange={(e) => onAno(+e.target.value)}>
              {getAnos().map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <span className="small-note" style={{ color: "#8891a0" }}>
            Navecon · Análise Tributária
          </span>
          <button className="btn secondary btn-modo-apresentacao" id="at-btnModoApresentacao" onClick={onToggleApresentacao}>
            {apresentacao ? "✕ Sair" : "✶ Apresentação"}
          </button>
        </div>
      </div>

      <div className="hero-economia">
        <div className="hero-label">Economia potencial estimada</div>
        <div className="hero-value">{fmtBRL(cenarios.economia)}</div>
        <div className="hero-sub">
          Optando por <b>{melhorCenario.label}</b> em vez do cenário mais custoso — {fmtPct(cenarios.economiaPerc)} de redução na carga tributária
        </div>
      </div>

      <div className="completude-badge no-print">
        <div className={`completude-linha completude-${completudeClasse}`}>
          <b>Completude dos dados ({ano}):</b> {fmtPct(completude.percReceita)} dos meses com faturamento preenchido em todas as empresas
          {incompletas.length > 0
            ? " — verificar antes da reunião: " + incompletas.map((d) => `${d.nome} (${d.mesesComReceita}/12 meses)`).join(" · ")
            : " — nenhum mês em branco detectado"}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi highlight">
          <div className="label">Cenário Recomendado</div>
          <div className="value" style={{ fontSize: 18 }}>
            {melhorCenario.label}
          </div>
        </div>
        <div className="kpi">
          <div className="label">Carga Tributária Anual</div>
          <div className="value">{fmtBRL(melhorCenario.total)}</div>
        </div>
        <div className="kpi">
          <div className="label">% sobre Faturamento</div>
          <div className="value">{cenarios.faturamentoAnual > 0 ? fmtPct(melhorCenario.total / cenarios.faturamentoAnual) : "—"}</div>
        </div>
        <div className="kpi">
          <div className="label">Faturamento Consolidado</div>
          <div className="value">{fmtBRL(cenarios.faturamentoAnual)}</div>
        </div>
      </div>

      <div className="chart-box">
        <h3>Carga Tributária Total por Cenário</h3>
        <canvas ref={chartCenariosRef} height={280} />
      </div>
      <div className="chart-box">
        <h3>Carga Atual × Carga com CBS (Transição)</h3>
        <canvas ref={chartReformaRef} height={280} />
        <p className="small-note" id="at-dashReformaNota" style={{ marginTop: 8 }}>
          Projeção simplificada: PIS/COFINS substituídos por CBS a 9,45% sobre o faturamento.
        </p>
      </div>
      <div className="chart-box">
        <h3>Evolução Mensal — Cenário Recomendado × Mais Custoso</h3>
        <canvas ref={chartMensalRef} height={280} />
      </div>
      <div className="chart-box">
        <h3>Evolução Anual — Cenário Recomendado</h3>
        <canvas ref={chartAnualRef} height={260} />
      </div>

      <div className="btn-row no-print nav-footer">
        <button className="btn secondary" onClick={() => onIrPara("relatorio")}>
          ← Anterior
        </button>
        <button className="btn secondary" onClick={() => window.print()}>
          Imprimir/Exportar PDF
        </button>
      </div>
    </section>
  );
}

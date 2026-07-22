"use client";

import { useMemo } from "react";
import { type Grupo, MESES, anosComDados, fmtBRL, fmtPct, getAnos, processarAno } from "@/lib/tributaria";
import type { ViewKey } from "./TributariaClient";

const CATEGORIAS: { key: "irpj" | "csll" | "pis" | "cofins" | "icmsNormal" | "icmsTTD" | "iss" | "fundos" | "ipi" | "inss" | "simples"; label: string }[] = [
  { key: "simples", label: "Simples (DAS)" },
  { key: "irpj", label: "IRPJ" },
  { key: "csll", label: "CSLL" },
  { key: "pis", label: "PIS" },
  { key: "cofins", label: "COFINS" },
  { key: "icmsNormal", label: "ICMS" },
  { key: "icmsTTD", label: "ICMS TTD" },
  { key: "iss", label: "ISS" },
  { key: "fundos", label: "Fundos Estaduais" },
  { key: "ipi", label: "IPI" },
  { key: "inss", label: "INSS Patronal" },
];

export function ViewRelatorio({
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
  const { cenarios } = useMemo(() => processarAno(grupo, ano), [grupo, ano]);

  const anosParaComparar = useMemo(() => {
    const anos = new Set(anosComDados(grupo));
    anos.add(ano);
    return Array.from(anos).sort((a, b) => a - b);
  }, [grupo, ano]);

  const comparativoAnual = useMemo(
    () =>
      anosParaComparar.map((a) => {
        const { resultados, cenarios: c } = processarAno(grupo, a);
        const melhor = c.cenarios.find((x) => x.chave === c.melhorChave)!;
        const faturamento = resultados.reduce((s, r) => s + r.receitaTotal, 0);
        return { ano: a, melhorLabel: melhor.label, melhorTotal: melhor.total, pctFaturamento: faturamento > 0 ? melhor.total / faturamento : 0 };
      }),
    [grupo, anosParaComparar],
  );

  if (grupo.empresas.length === 0) {
    return (
      <section className="at-view active">
        <div className="empty-state">Cadastre empresas e preencha dados mensais antes de gerar o relatório.</div>
        <div className="btn-row no-print">
          <button className="btn secondary" onClick={() => onIrPara("dados")}>
            ← Anterior
          </button>
        </div>
      </section>
    );
  }

  const melhorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.melhorChave)!;
  const piorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.piorChave)!;

  return (
    <section className="at-view active">
      <div className="print-cover print-only">
        <span className="eyebrow">CENTRAL CONTÁBIL · NAVECON</span>
        <h1>Relatório de Análise Tributária</h1>
        <p className="sub">Comparativo entre regimes tributários</p>
        <p className="campo">
          <b>Grupo:</b> {grupo.grupoNome}
        </p>
        <p className="campo">
          <b>Ano-base:</b> {ano}
        </p>
        <p className="campo">
          <b>Responsável:</b> {grupo.grupoResponsavel || "—"}
        </p>
        <span className="selo">Documento Confidencial</span>
      </div>
      <div className="print-footer print-only">
        <span>Navecon Contabilidade e Assessoria — Documento Confidencial</span>
        <span>
          {grupo.grupoNome} · Ano-base {ano}
        </span>
      </div>

      <div className="btn-row no-print" style={{ marginTop: 0, marginBottom: 20, justifyContent: "space-between" }}>
        <label className="small-note">
          Ano{" "}
          <select style={{ width: "auto", display: "inline-block" }} value={ano} onChange={(e) => onAno(+e.target.value)}>
            {getAnos().map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <button className="btn secondary btn-modo-apresentacao" id="at-btnModoApresentacaoRel" onClick={onToggleApresentacao}>
          {apresentacao ? "✕ Sair do Modo Apresentação" : "✶ Modo Apresentação"}
        </button>
      </div>

      <div className="card">
        <h2>Resumo Executivo</h2>
        <div className="kpis">
          <div className="kpi highlight">
            <div className="label">Melhor Opção</div>
            <div className="value" style={{ fontSize: 18 }}>
              {melhorCenario.label}
            </div>
          </div>
          <div className="kpi">
            <div className="label">Carga Tributária do Melhor Cenário</div>
            <div className="value">{fmtBRL(melhorCenario.total)}</div>
          </div>
          <div className="kpi">
            <div className="label">Economia vs. Pior Cenário</div>
            <div className="value">{fmtBRL(cenarios.economia)}</div>
            <p className="small-note">{fmtPct(cenarios.economiaPerc)} mais barato que {piorCenario.label}</p>
          </div>
          <div className="kpi">
            <div className="label">Faturamento Consolidado</div>
            <div className="value">{fmtBRL(cenarios.faturamentoAnual)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 id="at-relatorioComparativoTitulo">Comparativo Consolidado — Cenários</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="report">
            <thead>
              <tr>
                <th>Cenário</th>
                <th>Total Anual</th>
                <th>% sobre Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {cenarios.cenarios.map((c) => (
                <tr key={c.chave} className={c.chave === cenarios.melhorChave ? "best" : ""}>
                  <td>
                    {c.label}
                    {c.chave === cenarios.melhorChave && <span className="badge-best">Recomendado</span>}
                  </td>
                  <td>{fmtBRL(c.total)}</td>
                  <td>{cenarios.faturamentoAnual > 0 ? fmtPct(c.total / cenarios.faturamentoAnual) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Comparativo Pós-Reforma — Carga Atual vs. Carga com CBS</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="report">
            <thead>
              <tr>
                <th>Cenário</th>
                <th>Carga Atual</th>
                <th>CBS Projetado (Transição)</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              {cenarios.detalhados.map((d) => {
                const variacao = d.cbsTotal - d.total;
                return (
                  <tr key={d.chave}>
                    <td>{d.label}</td>
                    <td>{fmtBRL(d.total)}</td>
                    <td>{fmtBRL(d.cbsTotal)}</td>
                    <td style={{ color: variacao > 0 ? "var(--danger)" : "var(--success)" }}>
                      {variacao > 0 ? "+" : ""}
                      {fmtBRL(variacao)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small-note" style={{ marginTop: 10 }}>
          Projeção simplificada de transição: PIS e COFINS substituídos por CBS a {(0.0945 * 100).toFixed(2)}% sobre o faturamento. Não considera IBS
          estadual/municipal nem regras de crédito da reforma — validar periodicamente.
        </p>
      </div>

      <div className="card">
        <h2>Comparativo Anual entre Regimes</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="report">
            <thead>
              <tr>
                <th>Ano</th>
                <th>Melhor Cenário</th>
                <th>Carga Tributária</th>
                <th>% sobre Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {comparativoAnual.map((row) => (
                <tr key={row.ano} className={row.ano === ano ? "total" : ""}>
                  <td>{row.ano}</td>
                  <td>{row.melhorLabel}</td>
                  <td>{fmtBRL(row.melhorTotal)}</td>
                  <td>{fmtPct(row.pctFaturamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Detalhamento Mensal por Cenário</h2>
        {cenarios.detalhados.map((d) => (
          <div key={d.chave} style={{ marginBottom: 24 }}>
            <h4 style={{ fontFamily: "var(--serif)", fontSize: 14, marginBottom: 10 }}>{d.label}</h4>
            <div style={{ overflowX: "auto" }}>
              <table className="report">
                <thead>
                  <tr>
                    <th>Tributo</th>
                    {MESES.map((m) => (
                      <th key={m}>{m}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIAS.map((cat) => {
                    const arr = d[cat.key];
                    const total = arr.reduce((a, v) => a + v, 0);
                    if (total === 0) return null;
                    return (
                      <tr key={cat.key}>
                        <td>{cat.label}</td>
                        {arr.map((v, i) => (
                          <td key={i}>{fmtBRL(v)}</td>
                        ))}
                        <td>{fmtBRL(total)}</td>
                      </tr>
                    );
                  })}
                  <tr className="total">
                    <td>Total do Cenário</td>
                    {d.totalMes.map((v, i) => (
                      <td key={i}>{fmtBRL(v)}</td>
                    ))}
                    <td>{fmtBRL(d.total)}</td>
                  </tr>
                  <tr className="cbs-row">
                    <td>Débito de CBS projetado</td>
                    {d.cbsPorMes.map((v, i) => (
                      <td key={i}>{fmtBRL(v)}</td>
                    ))}
                    <td>{fmtBRL(d.cbsTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="btn-row no-print nav-footer">
        <button className="btn secondary" onClick={() => onIrPara("dados")}>
          ← Anterior
        </button>
        <button className="btn secondary" onClick={() => window.print()}>
          Imprimir/Exportar PDF
        </button>
        <button className="btn" onClick={() => onIrPara("dashboard")}>
          Próximo →
        </button>
      </div>
    </section>
  );
}

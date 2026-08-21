"use client";

import { useMemo } from "react";
import { CBS_RATE, type Grupo, MESES, anosComDados, fmtBRL, fmtPct, processarAno } from "@/lib/tributaria";

export const CATEGORIAS: { key: "irpj" | "csll" | "pis" | "cofins" | "icmsNormal" | "icmsTTD" | "iss" | "fundos" | "ipi" | "inss" | "simples"; label: string }[] = [
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

// Conteúdo do relatório (tabelas comparativas) — usado tanto pela aba "3.
// Relatório" quanto embutido (só na impressão/PDF) dentro do Dashboard, pra
// quem exportar de lá também levar essas tabelas junto, sem duplicar a lógica.
export function RelatorioConteudo({ grupo, ano }: { grupo: Grupo; ano: number }) {
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

  const melhorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.melhorChave)!;
  const piorCenario = cenarios.cenarios.find((c) => c.chave === cenarios.piorChave)!;

  return (
    <>
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
            <p className="small-note">
              {fmtPct(cenarios.economiaPerc)} mais barato que {piorCenario.label}
            </p>
          </div>
          <div className="kpi">
            <div className="label">Faturamento Consolidado</div>
            <div className="value">{fmtBRL(cenarios.faturamentoAnual)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Comparativo Consolidado — Cenários</h2>
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
        <p className="desc">
          Aplica o débito de CBS projetado ({fmtPct(CBS_RATE)}) sobre cada cenário exibido, para dimensionar o impacto da transição em cada composição
          tributária simulada.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="report">
            <thead>
              <tr>
                <th>Cenário</th>
                <th>Carga Atual</th>
                <th>CBS Projetado</th>
                <th>Carga Total (Transição)</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              {cenarios.detalhados.map((d) => {
                const pisCofinsTotal = d.pis.reduce((a, v) => a + v, 0) + d.cofins.reduce((a, v) => a + v, 0);
                const cargaTotalTransicao = d.cbsTotal;
                const cbsProjetado = cargaTotalTransicao - (d.total - pisCofinsTotal);
                const variacao = d.total > 0 ? (cargaTotalTransicao - d.total) / d.total : 0;
                return (
                  <tr key={d.chave}>
                    <td>{d.label}</td>
                    <td>{fmtBRL(d.total)}</td>
                    <td>{fmtBRL(cbsProjetado)}</td>
                    <td>{fmtBRL(cargaTotalTransicao)}</td>
                    <td>{fmtPct(variacao)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small-note" style={{ marginTop: 10 }}>
          Carga Total (Transição) = (carga atual do cenário − PIS − COFINS) + (
          {cenarios.temSimples ? "faturamento do grupo menos faturamento intercompany" : "faturamento total do grupo"} × {fmtPct(CBS_RATE)}). Como a carga
          tributária e a base de PIS/COFINS variam por cenário, o CBS Projetado e a variação percentual também variam entre eles. Alíquota de referência para
          o período de transição — validar periodicamente.
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
            <h4 style={{ fontFamily: "var(--serif)", fontSize: 14, marginBottom: 10 }}>
              {d.label}
              {d.chave === cenarios.melhorChave && <span className="badge-best">Recomendado</span>}
            </h4>
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
    </>
  );
}

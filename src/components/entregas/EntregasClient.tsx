"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type EntregaRow,
  type EntregasStats,
  type GraficosMensal,
  type LastSync,
  type MetricasGeral,
  type PeriodResult,
  computeGraficosMensal,
  computeHeatmap,
  computeMetricasGeral,
  computePeriodStats,
  computePeriodStatsPorPessoa,
  computeStats,
  fmt,
  fmtDateBR,
  heatmapLevel,
  loadLastSync,
  pct,
  saveLastSync,
} from "@/lib/entregas";
import { drawGroupedBarChart, drawLineChart } from "@/lib/entregas-charts";
import { syncEntregasFromAcessorias } from "@/app/actions/entregas";

function PeriodoSelects({
  competencias,
  inicio,
  fim,
  onInicio,
  onFim,
  onAplicar,
  status,
}: {
  competencias: string[];
  inicio: string;
  fim: string;
  onInicio: (v: string) => void;
  onFim: (v: string) => void;
  onAplicar: () => void;
  status: string;
}) {
  return (
    <div className="btn-row no-print" style={{ marginTop: 0, marginBottom: 20 }}>
      <label className="small-note">
        De{" "}
        <select style={{ width: "auto", display: "inline-block" }} value={inicio} onChange={(e) => onInicio(e.target.value)}>
          {competencias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="small-note">
        até{" "}
        <select style={{ width: "auto", display: "inline-block" }} value={fim} onChange={(e) => onFim(e.target.value)}>
          {competencias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <button className="btn secondary" onClick={onAplicar}>
        Aplicar {status && "período"}
      </button>
      <span className="status-line">{status}</span>
    </div>
  );
}

function BucketTable({ rows, nomeLabel }: { rows: { nome: string; entregues: number; pendentes: number; atrasadas: number; justificadas: number }[]; nomeLabel: string }) {
  if (rows.length === 0) return <div className="empty-state">Nenhum dado no período selecionado.</div>;
  return (
    <table className="results">
      <thead>
        <tr>
          <th>{nomeLabel}</th>
          <th>Entregues</th>
          <th>Pendentes</th>
          <th>Atrasadas</th>
          <th>Justificadas</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.nome}>
            <td>{r.nome}</td>
            <td className="num">{fmt(r.entregues)}</td>
            <td className="num">{fmt(r.pendentes)}</td>
            <td className="num">{fmt(r.atrasadas)}</td>
            <td className="num">{fmt(r.justificadas)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function EntregasClient() {
  const [raw, setRaw] = useState<EntregaRow[] | null>(null);
  const [stats, setStats] = useState<EntregasStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [lastSync, setLastSync] = useState<LastSync | null>(null);
  const [apresentacao, setApresentacao] = useState(false);

  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [periodoResult, setPeriodoResult] = useState<PeriodResult | null>(null);
  const [periodoStatus, setPeriodoStatus] = useState("");

  const [diaSelecionado, setDiaSelecionado] = useState("");

  const [pessoaSelecionada, setPessoaSelecionada] = useState("");
  const [pessoaPeriodoInicio, setPessoaPeriodoInicio] = useState("");
  const [pessoaPeriodoFim, setPessoaPeriodoFim] = useState("");
  const [pessoaResult, setPessoaResult] = useState<{ porTarefa: PeriodResult["porTarefa"]; totalRows: number } | null>(null);
  const [pessoaStatus, setPessoaStatus] = useState("");

  const [metricasInicio, setMetricasInicio] = useState("");
  const [metricasFim, setMetricasFim] = useState("");
  const [metricas, setMetricas] = useState<MetricasGeral | null>(null);
  const [metricasStatus, setMetricasStatus] = useState("");

  const [graficosInicio, setGraficosInicio] = useState("");
  const [graficosFim, setGraficosFim] = useState("");
  const [graficos, setGraficos] = useState<GraficosMensal | null>(null);
  const [graficosStatus, setGraficosStatus] = useState("");

  const chartTendenciaRef = useRef<HTMLCanvasElement>(null);
  const chartComposicaoRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // localStorage não existe durante o SSR — só dá pra ler depois de montar no cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSync(loadLastSync());
    // Sincroniza automaticamente ao abrir a página — não deve exigir nenhuma ação manual.
    runSync();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("presentation-mode", apresentacao);
  }, [apresentacao]);

  const pessoasList = useMemo(() => {
    if (!raw) return [];
    return Array.from(new Set(raw.map((r) => r.respprazo || "(sem responsável)"))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [raw]);

  const heatmap = useMemo(() => (stats ? computeHeatmap(stats) : null), [stats]);

  async function runSync() {
    setSyncing(true);
    setSyncError("");
    try {
      const result = await syncEntregasFromAcessorias();
      if (!result.rows) {
        setSyncError(result.error ?? "Não foi possível sincronizar com o Acessórias.");
        return;
      }
      const rows = result.rows;
      setRaw(rows);
      const s = computeStats(rows);
      setStats(s);

      const comps = s.competenciasDisponiveis;
      if (comps.length > 0) {
        setPeriodoInicio(comps[0]);
        setPeriodoFim(comps[comps.length - 1]);
        setPeriodoResult(computePeriodStats(rows, comps[0], comps[comps.length - 1]));
        setPeriodoStatus("");

        setMetricasInicio(comps[0]);
        setMetricasFim(comps[comps.length - 1]);
        setMetricas(computeMetricasGeral(rows, comps[0], comps[comps.length - 1]));
        setMetricasStatus("");

        setGraficosInicio(comps[0]);
        setGraficosFim(comps[comps.length - 1]);
        setGraficos(computeGraficosMensal(s, comps[0], comps[comps.length - 1]));
        setGraficosStatus("");
      }

      const pessoas = Array.from(new Set(rows.map((r) => r.respprazo || "(sem responsável)"))).sort((a, b) => a.localeCompare(b, "pt-BR"));
      if (pessoas.length > 0 && comps.length > 0) {
        setPessoaSelecionada(pessoas[0]);
        setPessoaPeriodoInicio(comps[0]);
        setPessoaPeriodoFim(comps[comps.length - 1]);
        setPessoaResult(computePeriodStatsPorPessoa(rows, comps[0], comps[comps.length - 1], pessoas[0]));
        setPessoaStatus("");
      }

      if (s.diasComEntrega.length > 0) setDiaSelecionado(s.diasComEntrega[0]);

      const info: LastSync = { timestamp: Date.now(), totalEmpresas: result.totalEmpresas ?? 0, totalObrigacoes: rows.length };
      saveLastSync(info);
      setLastSync(info);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Não foi possível sincronizar com o Acessórias.");
    } finally {
      setSyncing(false);
    }
  }

  function aplicarPeriodo() {
    if (!raw) return;
    const result = computePeriodStats(raw, periodoInicio, periodoFim);
    if (!result) {
      setPeriodoStatus("Intervalo inválido — confira as competências selecionadas.");
      return;
    }
    setPeriodoResult(result);
    setPeriodoStatus(`${fmt(result.totalRows)} obrigações no período.`);
  }

  function aplicarPessoaPeriodo() {
    if (!raw || !pessoaSelecionada) return;
    const result = computePeriodStatsPorPessoa(raw, pessoaPeriodoInicio, pessoaPeriodoFim, pessoaSelecionada);
    if (!result) {
      setPessoaStatus("Intervalo inválido — confira as competências selecionadas.");
      return;
    }
    setPessoaResult(result);
    setPessoaStatus(`${fmt(result.totalRows)} obrigações no período.`);
  }

  function aplicarMetricas() {
    if (!raw) return;
    const result = computeMetricasGeral(raw, metricasInicio, metricasFim);
    if (!result) {
      setMetricasStatus("Intervalo inválido — confira as competências selecionadas.");
      return;
    }
    setMetricas(result);
    setMetricasStatus("");
  }

  function aplicarGraficos() {
    if (!stats) return;
    const result = computeGraficosMensal(stats, graficosInicio, graficosFim);
    if (!result) {
      setGraficosStatus("Intervalo inválido — confira as competências selecionadas.");
      return;
    }
    setGraficos(result);
    setGraficosStatus("");
  }

  useEffect(() => {
    if (!graficos || !chartTendenciaRef.current || !chartComposicaoRef.current) return;
    drawLineChart(
      chartTendenciaRef.current,
      graficos.tendenciaMensal.map((t) => t.mes),
      [{ data: graficos.tendenciaMensal.map((t) => Number(t.taxa.toFixed(1))), color: "#2F6690" }],
      300,
      (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + "%",
    );
    drawGroupedBarChart(
      chartComposicaoRef.current,
      graficos.meses.map((m) => m.mes),
      [
        { name: "Entregues", color: "#3A9188", data: graficos.meses.map((m) => m.entregues) },
        { name: "Pendentes", color: "#8695AA", data: graficos.meses.map((m) => m.pendentes) },
        { name: "Atrasadas", color: "#B0475A", data: graficos.meses.map((m) => m.atrasadas) },
        { name: "Justificadas", color: "#C97A3D", data: graficos.meses.map((m) => m.justificadas) },
      ],
      340,
    );
  }, [graficos]);

  function toggleApresentacao() {
    const ligado = !apresentacao;
    setApresentacao(ligado);
    if (ligado) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  const locked = !stats;
  const diaLinhas = stats && diaSelecionado ? Object.entries(stats.porDiaPessoa[diaSelecionado] ?? {}).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd) : [];
  const diaTotal = diaLinhas.reduce((s, l) => s + l.qtd, 0);

  return (
    <section id="tool-entregas">
      {apresentacao && (
        <button type="button" className="btn secondary no-print btn-modo-apresentacao" id="ent-btnSairApresentacaoFloat" style={{ position: "fixed", top: 16, right: 16, zIndex: 9100 }} onClick={toggleApresentacao}>
          ✕ Sair do Modo Apresentação
        </button>
      )}

      <div className="tool-header">
        <div className="wrap">
          <h1>Dashboard de Gestão de Entregas</h1>
          <p>Dados sincronizados automaticamente com o Acessórias — sem necessidade de anexar relatório.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 8 }}>
        <section className="step no-print" id="ent-stepUpload">
          <div className="step-head">
            <span className="step-num">01</span>
            <div>
              <div className="step-title">Sincronização com o Acessórias</div>
              <p className="step-sub">Puxa direto da API do Acessórias as entregas/obrigações dos departamentos Célula Contábil e Lançamentos, do ano até hoje.</p>
            </div>
          </div>
          {lastSync && (
            <div style={{ marginBottom: 16 }}>
              <span className="stamp ok">Última sincronização</span>{" "}
              <span className="small-note">
                {new Date(lastSync.timestamp).toLocaleDateString("pt-BR")} às{" "}
                {new Date(lastSync.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                {fmt(lastSync.totalEmpresas)} empresas · {fmt(lastSync.totalObrigacoes)} obrigações
              </span>
            </div>
          )}
          <div className="btn-row">
            <button className="btn" disabled={syncing} onClick={runSync}>
              {syncing ? "Sincronizando..." : "Sincronizar agora"}
            </button>
            {syncError && <span className="small-note" style={{ color: "var(--danger)" }}>{syncError}</span>}
          </div>
        </section>

        <section className={`step${locked ? " locked" : ""}`} id="ent-stepKpi">
          <div className="step-head">
            <span className="step-num">02</span>
            <div>
              <div className="step-title">Panorama geral</div>
              <p className="step-sub">
                {stats
                  ? `${fmt(stats.ativas)} obrigações ativas (${fmt(stats.dispensadas)} dispensadas) · ${fmt(stats.empresasDistintas)} empresas · ${fmt(stats.responsaveisDistintos)} responsáveis envolvidos`
                  : "Aguardando processamento do arquivo."}
              </p>
            </div>
          </div>
          {stats && (
            <div className="summary">
              <div className="kpi success">
                <div className="label">Entregues</div>
                <div className="value">{fmt(stats.entregues)}</div>
                <p className="small-note">{pct(stats.pctEntregue)} das obrigações ativas</p>
              </div>
              <div className="kpi">
                <div className="label">Pendentes</div>
                <div className="value">{fmt(stats.pendentes)}</div>
                <p className="small-note">ainda dentro do prazo</p>
              </div>
              <div className={`kpi ${stats.atrasadas > 0 ? "danger" : "success"}`}>
                <div className="label">Atrasadas (crítico)</div>
                <div className="value">{fmt(stats.atrasadas)}</div>
                <p className="small-note">prazo legal vencido, não entregue</p>
              </div>
              <div className={`kpi ${stats.justificadas > 0 ? "warn" : "success"}`}>
                <div className="label">Justificadas</div>
                <div className="value">{fmt(stats.justificadas)}</div>
                <p className="small-note">atraso ou pendência com justificativa</p>
              </div>
            </div>
          )}
        </section>

        <section className={`step${locked ? " locked" : ""}`} id="ent-stepMes">
          <div className="step-head">
            <span className="step-num">03</span>
            <div>
              <div className="step-title">Entregas por mês</div>
              <p className="step-sub">Agrupado por competência (mês de referência da obrigação). Dispensadas ficam fora da contagem.</p>
            </div>
          </div>
          {stats && stats.porMesDetalhado.length === 0 ? (
            <div className="empty-state">Sem dados de competência.</div>
          ) : stats ? (
            <table className="results">
              <thead>
                <tr>
                  <th>Mês (competência)</th>
                  <th>Entregues</th>
                  <th>Pendentes</th>
                  <th>Atrasadas</th>
                  <th>Justificadas</th>
                </tr>
              </thead>
              <tbody>
                {stats.porMesDetalhado.map((m) => (
                  <tr key={m.mes}>
                    <td>{m.mes}</td>
                    <td className="num">{fmt(m.entregues)}</td>
                    <td className="num">{fmt(m.pendentes)}</td>
                    <td className="num">{fmt(m.atrasadas)}</td>
                    <td className="num">{fmt(m.justificadas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className={`step${locked ? " locked" : ""}`} id="ent-stepPeriodo">
          <div className="step-head">
            <span className="step-num">04</span>
            <div>
              <div className="step-title">Por tarefa e ranking do período</div>
              <p className="step-sub">Selecione um intervalo de competência para ver o desempenho por tipo de obrigação e quais tarefas mais entregaram nesse recorte.</p>
            </div>
          </div>
          {stats && (
            <>
              <PeriodoSelects
                competencias={stats.competenciasDisponiveis}
                inicio={periodoInicio}
                fim={periodoFim}
                onInicio={setPeriodoInicio}
                onFim={setPeriodoFim}
                onAplicar={aplicarPeriodo}
                status={periodoStatus}
              />
              <div className="panel">
                <h4>Por pessoa no período</h4>
                <p className="panel-sub">Contagem por status de cada colaborador (Responsável prazo) dentro do intervalo selecionado</p>
                <BucketTable rows={periodoResult?.porPessoa ?? []} nomeLabel="Pessoa" />
              </div>
              <div className="panel" style={{ marginTop: 16 }}>
                <h4>Por tarefa no período</h4>
                <p className="panel-sub">Contagem por tipo de obrigação dentro do intervalo selecionado</p>
                <BucketTable rows={periodoResult?.porTarefa ?? []} nomeLabel="Tarefa / Obrigação" />
              </div>
            </>
          )}
        </section>

        <section className={`step${locked ? " locked" : ""}`} id="ent-stepDia">
          <div className="step-head">
            <span className="step-num">05</span>
            <div>
              <div className="step-title">Entregas por dia por pessoa</div>
              <p className="step-sub">Produtividade diária com base em &quot;Data da entrega&quot; + &quot;Responsável prazo&quot; (só entram linhas com data de entrega preenchida).</p>
            </div>
          </div>
          {stats && (
            <div className="grid2">
              <div className="panel">
                <h4>Ranking do dia</h4>
                <p className="panel-sub">
                  {stats.diasComEntrega.length === 0 ? (
                    "Sem datas de entrega no arquivo."
                  ) : (
                    <select style={{ width: "auto", display: "inline-block", padding: "6px 10px", fontFamily: "var(--mono)", fontSize: 12.5 }} value={diaSelecionado} onChange={(e) => setDiaSelecionado(e.target.value)}>
                      {stats.diasComEntrega.map((d) => (
                        <option key={d} value={d}>
                          {fmtDateBR(d)}
                        </option>
                      ))}
                    </select>
                  )}
                </p>
                {diaLinhas.length === 0 ? (
                  <div className="empty-state">Sem entregas nesse dia.</div>
                ) : (
                  <table className="results">
                    <thead>
                      <tr>
                        <th>Responsável</th>
                        <th>Entregas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diaLinhas.map((l) => (
                        <tr key={l.nome}>
                          <td>{l.nome}</td>
                          <td className="num">{fmt(l.qtd)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Total do dia</td>
                        <td className="num">{fmt(diaTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
              <div className="panel">
                <h4>Mapa de calor · últimos dias por pessoa</h4>
                <p className="panel-sub">
                  Colaboradores com entregas registradas × últimos 14 dias com registro. Quem está há mais de 10 dias sem nenhuma entrega registrada fica oculto (indício de que já não faz mais parte da equipe).
                </p>
                <div style={{ overflowX: "auto" }}>
                  {!heatmap || heatmap.pessoas.length === 0 ? (
                    <div className="empty-state">Nenhum colaborador ativo nos últimos dias com registro.</div>
                  ) : (
                    <table className="heatmap">
                      <thead>
                        <tr>
                          <th className="person">Pessoa</th>
                          {heatmap.diasAsc.map((d) => (
                            <th key={d}>{d.slice(8, 10)}/{d.slice(5, 7)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmap.pessoas.map((nome) => (
                          <tr key={nome}>
                            <td className="person" style={{ fontSize: 11, paddingRight: 8 }}>
                              {nome}
                            </td>
                            {heatmap.diasAsc.map((d) => {
                              const qtd = heatmap.matriz[d]?.[nome] ?? 0;
                              const lvl = heatmapLevel(qtd);
                              return (
                                <td key={d}>
                                  <div className={`hm-cell hm-${lvl}`} title={`${nome} · ${fmtDateBR(d)}: ${qtd}`}>
                                    {qtd || ""}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {heatmap && heatmap.ocultos > 0 && (
                  <p className="small-note" style={{ marginTop: 8 }}>
                    {heatmap.ocultos} colaborador(es) oculto(s) por inatividade (mais de 10 dias sem nenhuma entrega registrada): {heatmap.ocultosNomes.join(", ")}.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className={`step${locked ? " locked" : ""}`} id="ent-stepPessoa">
          <div className="step-head">
            <span className="step-num">06</span>
            <div>
              <div className="step-title">Por pessoa e período</div>
              <p className="step-sub">Veja o desempenho de uma pessoa específica por tipo de obrigação, num intervalo de competência.</p>
            </div>
          </div>
          {stats && (
            <>
              <div className="btn-row no-print" style={{ marginTop: 0, marginBottom: 20 }}>
                <label className="small-note">
                  Pessoa{" "}
                  <select style={{ width: "auto", display: "inline-block" }} value={pessoaSelecionada} onChange={(e) => setPessoaSelecionada(e.target.value)}>
                    {pessoasList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="small-note">
                  De{" "}
                  <select style={{ width: "auto", display: "inline-block" }} value={pessoaPeriodoInicio} onChange={(e) => setPessoaPeriodoInicio(e.target.value)}>
                    {stats.competenciasDisponiveis.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="small-note">
                  até{" "}
                  <select style={{ width: "auto", display: "inline-block" }} value={pessoaPeriodoFim} onChange={(e) => setPessoaPeriodoFim(e.target.value)}>
                    {stats.competenciasDisponiveis.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn secondary" onClick={aplicarPessoaPeriodo}>
                  Aplicar
                </button>
                <span className="status-line">{pessoaStatus}</span>
              </div>
              <div className="panel">
                <h4>Por tarefa no período · {pessoaSelecionada}</h4>
                <BucketTable rows={pessoaResult?.porTarefa ?? []} nomeLabel="Tarefa / Obrigação" />
              </div>
            </>
          )}
        </section>

        <section className={`step${locked ? " locked" : ""}`} id="ent-stepMetricas">
          <div className="step-head">
            <span className="step-num">07</span>
            <div>
              <div className="step-title">Indicadores de produtividade</div>
              <p className="step-sub">Métricas agregadas da equipe no intervalo de competência selecionado.</p>
            </div>
          </div>
          {stats && (
            <>
              <PeriodoSelects
                competencias={stats.competenciasDisponiveis}
                inicio={metricasInicio}
                fim={metricasFim}
                onInicio={setMetricasInicio}
                onFim={setMetricasFim}
                onAplicar={aplicarMetricas}
                status={metricasStatus}
              />
              {metricas && (
                <div className="summary">
                  <div className={`kpi ${metricas.taxaCumprimento >= 90 ? "success" : metricas.taxaCumprimento >= 75 ? "warn" : "danger"}`}>
                    <div className="label">Taxa de Cumprimento</div>
                    <div className="value">{pct(metricas.taxaCumprimento)}</div>
                    <p className="small-note">obrigações ativas entregues (no prazo ou com atraso)</p>
                  </div>
                  <div className={`kpi ${metricas.taxaPontualidadeReal >= 80 ? "success" : metricas.taxaPontualidadeReal >= 60 ? "warn" : "danger"}`}>
                    <div className="label">Pontualidade Real</div>
                    <div className="value">{pct(metricas.taxaPontualidadeReal)}</div>
                    <p className="small-note">entregue sem nenhum atraso na data</p>
                  </div>
                  <div className={`kpi ${metricas.taxaAtrasoCritico > 3 ? "danger" : "success"}`}>
                    <div className="label">Atraso Crítico (em aberto)</div>
                    <div className="value">{pct(metricas.taxaAtrasoCritico)}</div>
                    <p className="small-note">prazo vencido, ainda não entregue</p>
                  </div>
                  <div className="kpi">
                    <div className="label">Produtividade Média</div>
                    <div className="value">{metricas.produtividadeMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</div>
                    <p className="small-note">
                      obrigações / pessoa / mês · {metricas.numPessoas} pessoas ativas em {metricas.numMeses} meses
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className={`step${locked ? " locked" : ""}`} id="ent-stepGraficos">
          <div className="step-head">
            <span className="step-num">08</span>
            <div>
              <div className="step-title">Gráficos</div>
              <p className="step-sub">Evolução mensal da taxa de cumprimento e composição por categoria, no intervalo selecionado.</p>
            </div>
          </div>
          {stats && (
            <>
              <PeriodoSelects
                competencias={stats.competenciasDisponiveis}
                inicio={graficosInicio}
                fim={graficosFim}
                onInicio={setGraficosInicio}
                onFim={setGraficosFim}
                onAplicar={aplicarGraficos}
                status={graficosStatus}
              />
              <div className="chart-box">
                <h3>Evolução mensal da taxa de cumprimento da equipe</h3>
                <canvas ref={chartTendenciaRef} height={300} />
              </div>
              <div className="chart-box">
                <h3>Composição por mês (entregue · pendente · atrasada · justificada)</h3>
                <canvas ref={chartComposicaoRef} height={340} />
              </div>
            </>
          )}
        </section>

        <div className="footer-actions no-print">
          <button className="btn secondary" disabled={syncing} onClick={runSync}>
            {syncing ? "Sincronizando..." : "Sincronizar novamente"}
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn secondary btn-modo-apresentacao" onClick={toggleApresentacao}>
              {apresentacao ? "✕ Sair do Modo Apresentação" : "✦ Modo Apresentação"}
            </button>
            <button className="btn" disabled={locked} onClick={() => window.print()}>
              ⤓ Baixar como PDF
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

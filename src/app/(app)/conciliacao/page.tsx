"use client";

import { useRef, useState } from "react";
import {
  type BankColumnMapping,
  type ContasColumnMapping,
  type Entry,
  type Match,
  type ParsedFile,
  type ReconciliationResult,
  buildBankEntries,
  buildLedgerEntries,
  exportExcel,
  fmtDate,
  fmtMoney,
  guessColumn,
  readAnyFile,
  runReconciliation,
} from "@/lib/conciliacao";
import { extractPdfRowsWithAI, refineMatchesWithAI, suggestColumnMapping } from "@/app/actions/conciliacao-ai";

type Tab = "ok" | "soma" | "sug" | "pend-banco" | "pend-contas";

function guessBankMapping(headers: string[]): BankColumnMapping {
  return {
    data: Math.max(0, guessColumn(headers, ["data"])),
    desc: Math.max(0, guessColumn(headers, ["hist", "descri", "favorecido"])),
    split: false,
    valor: Math.max(0, guessColumn(headers, ["valor"])),
    debito: guessColumn(headers, ["deb", "saida", "saída"]),
    credito: guessColumn(headers, ["cred", "entrada"]),
  };
}

function guessContasMapping(headers: string[]): ContasColumnMapping {
  return {
    data: Math.max(0, guessColumn(headers, ["data"])),
    desc: Math.max(0, guessColumn(headers, ["hist", "descri", "favorecido"])),
    valor: Math.max(0, guessColumn(headers, ["valor"])),
    tipo: guessColumn(headers, ["tipo", "natureza"]),
    txtRec: "receb",
    txtPag: "pag",
  };
}

function FilePreview({ file }: { file: ParsedFile }) {
  const sample = file.rows.slice(0, 4);
  return (
    <table className="preview-table">
      <thead>
        <tr>
          {file.headers.map((h, i) => (
            <th key={i}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sample.map((r, ri) => (
          <tr key={ri}>
            {file.headers.map((_, ci) => (
              <td key={ci}>{r[ci] ?? ""}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ConciliacaoPage() {
  const [banco, setBanco] = useState<ParsedFile | null>(null);
  const [bancoFileName, setBancoFileName] = useState<string | null>(null);
  const [bancoError, setBancoError] = useState<string | null>(null);
  const [bancoMapping, setBancoMapping] = useState<BankColumnMapping | null>(null);
  const [bancoAiStatus, setBancoAiStatus] = useState<string | null>(null);
  const [bancoExtracting, setBancoExtracting] = useState(false);
  const [bancoExtractStatus, setBancoExtractStatus] = useState<string | null>(null);

  const [contas, setContas] = useState<ParsedFile | null>(null);
  const [contasFileName, setContasFileName] = useState<string | null>(null);
  const [contasError, setContasError] = useState<string | null>(null);
  const [contasMapping, setContasMapping] = useState<ContasColumnMapping | null>(null);
  const [contasAiStatus, setContasAiStatus] = useState<string | null>(null);
  const [contasExtracting, setContasExtracting] = useState(false);
  const [contasExtractStatus, setContasExtractStatus] = useState<string | null>(null);

  const [tol, setTol] = useState(0.01);
  const [dayWindow, setDayWindow] = useState(3);
  const [simThreshold, setSimThreshold] = useState(0.55);

  const [bankEntries, setBankEntries] = useState<Entry[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<Entry[]>([]);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [tab, setTab] = useState<Tab>("ok");
  const [aiRefineStatus, setAiRefineStatus] = useState<string | null>(null);
  const [aiRefining, setAiRefining] = useState(false);

  const bancoInputRef = useRef<HTMLInputElement>(null);
  const contasInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(kind: "banco" | "contas", file: File) {
    const setFile = kind === "banco" ? setBanco : setContas;
    const setName = kind === "banco" ? setBancoFileName : setContasFileName;
    const setError = kind === "banco" ? setBancoError : setContasError;
    const setAiStatus = kind === "banco" ? setBancoAiStatus : setContasAiStatus;

    setError(null);
    setName(file.name);
    try {
      const parsed = await readAnyFile(file);
      setFile(parsed);
      if (kind === "banco") setBancoMapping(guessBankMapping(parsed.headers));
      else setContasMapping(guessContasMapping(parsed.headers));

      setAiStatus("Sugerindo mapeamento com IA...");
      const { mapping, source, error } = await suggestColumnMapping(kind, parsed.headers, parsed.rows.slice(0, 5));
      if (kind === "banco") {
        setBancoMapping((prev) => {
          const base = prev ?? guessBankMapping(parsed.headers);
          const hasSplit = mapping.debito !== null || mapping.credito !== null;
          return {
            data: mapping.data ?? base.data,
            desc: mapping.descricao ?? base.desc,
            split: hasSplit,
            valor: hasSplit ? base.valor : mapping.valor ?? base.valor,
            debito: hasSplit ? mapping.debito ?? base.debito : base.debito,
            credito: hasSplit ? mapping.credito ?? base.credito : base.credito,
          };
        });
      } else {
        setContasMapping((prev) => {
          const base = prev ?? guessContasMapping(parsed.headers);
          return {
            ...base,
            data: mapping.data ?? base.data,
            desc: mapping.descricao ?? base.desc,
            valor: mapping.valor ?? base.valor,
            tipo: mapping.tipo ?? base.tipo,
          };
        });
      }
      setAiStatus(
        source === "ia" ? "✨ Mapeamento sugerido pela IA — confira antes de continuar." : `Sugestão por palavras-chave aplicada${error ? ` (IA indisponível: ${error})` : ""}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro ao ler arquivo");
    }
  }

  async function handleAiExtract(kind: "banco" | "contas") {
    const file = kind === "banco" ? banco : contas;
    if (!file?.pdfLines?.length) return;
    const setExtracting = kind === "banco" ? setBancoExtracting : setContasExtracting;
    const setStatus = kind === "banco" ? setBancoExtractStatus : setContasExtractStatus;
    const setFile = kind === "banco" ? setBanco : setContas;

    setExtracting(true);
    setStatus("IA lendo o documento...");
    const refYear = (() => {
      const fullText = file.pdfLines.join(" ");
      const m = fullText.match(/per[íi]odo:?\s*\d{2}\/\d{2}\/(\d{4})/i);
      return m ? +m[1] : new Date().getFullYear();
    })();
    const { rows, error } = await extractPdfRowsWithAI(file.pdfLines, refYear);
    if (error || rows.length === 0) {
      setStatus(`Não consegui extrair com IA: ${error ?? "nenhum lançamento encontrado"}`);
      setExtracting(false);
      return;
    }
    const headers = ["Data", "Descrição", "Valor"];
    const dataRows = rows.map((r) => [r.data, r.descricao, String(r.valor)]);
    const updated: ParsedFile = { headers, rows: dataRows, pdfLines: file.pdfLines };
    setFile(updated);
    if (kind === "banco") setBancoMapping(guessBankMapping(headers));
    else setContasMapping(guessContasMapping(headers));
    setStatus(`✨ IA extraiu ${dataRows.length} lançamento(s) — mapeamento atualizado abaixo.`);
    setExtracting(false);
  }

  function removeFile(kind: "banco" | "contas") {
    if (kind === "banco") {
      setBanco(null);
      setBancoFileName(null);
      setBancoMapping(null);
      setBancoAiStatus(null);
      setBancoExtractStatus(null);
    } else {
      setContas(null);
      setContasFileName(null);
      setContasMapping(null);
      setContasAiStatus(null);
      setContasExtractStatus(null);
    }
  }

  const ready = !!banco && !!contas && banco.rows.length > 0 && contas.rows.length > 0;

  function handleReconcile() {
    if (!banco || !contas || !bancoMapping || !contasMapping) return;
    const bank = buildBankEntries(banco.rows, bancoMapping);
    const ledger = buildLedgerEntries(contas.rows, contasMapping);
    setBankEntries(bank);
    setLedgerEntries(ledger);
    setResult(runReconciliation(bank, ledger, tol, dayWindow, simThreshold));
    setTab("ok");
  }

  function confirmMatch(idx: number) {
    setResult((prev) => {
      if (!prev) return prev;
      const matches = prev.matches.slice();
      matches[idx] = { ...matches[idx], status: "confirmed" };
      return { ...prev, matches };
    });
  }

  function rejectMatch(idx: number) {
    setResult((prev) => {
      if (!prev) return prev;
      const m = prev.matches[idx];
      const matches = prev.matches.filter((_, i) => i !== idx);
      return { ...prev, matches, pendBanco: [...prev.pendBanco, m.bank], pendContas: [...prev.pendContas, m.ledger] };
    });
  }

  async function handleRefine() {
    if (!result) return;
    const toReview = result.matches.map((m, idx) => ({ m, idx })).filter(({ m }) => m.status === "pending_review");
    if (toReview.length === 0) {
      setAiRefineStatus("Não há sugestões pendentes para refinar.");
      return;
    }
    setAiRefining(true);
    setAiRefineStatus(`Consultando IA para ${toReview.length} caso(s)...`);

    const items = toReview.map(({ m }, i) => ({
      idx: i,
      valor: m.bank.value,
      descricao_banco: m.bank.desc,
      candidatos: [m.ledger, ...m.alt.map((a) => a.l)].map((l, ci) => ({
        ci,
        descricao_contas: l.desc,
        data_diff_dias: Math.round(Math.abs((l.date.getTime() - m.bank.date.getTime()) / 86400000)),
      })),
    }));

    const { results, error } = await refineMatchesWithAI(items);
    if (error && results.length === 0) {
      setAiRefineStatus(`Erro ao consultar IA: ${error}. Você ainda pode revisar manualmente.`);
      setAiRefining(false);
      return;
    }

    setResult((prev) => {
      if (!prev) return prev;
      const matches = prev.matches.slice();
      results.forEach((r) => {
        const entry = toReview[r.idx];
        if (!entry) return;
        const globalIdx = entry.idx;
        const m = matches[globalIdx];
        if (!m) return;
        if (r.melhor_ci === null || r.confianca < 0.4) return;
        const candidatesList = [m.ledger, ...m.alt.map((a) => a.l)];
        const chosen = candidatesList[r.melhor_ci];
        if (!chosen) return;
        matches[globalIdx] = {
          ...m,
          ledger: chosen,
          score: r.confianca,
          method: "ai",
          status: r.confianca >= 0.75 ? "confirmed" : "pending_review",
        };
      });
      return { ...prev, matches };
    });

    setAiRefineStatus(`IA analisou ${toReview.length} caso(s). Revise os resultados abaixo.`);
    setAiRefining(false);
  }

  function handleExport() {
    if (!result) return;
    exportExcel(result.matches, result.groupMatches, result.pendBanco, result.pendContas, bankEntries, ledgerEntries);
  }

  const auto = result ? result.matches.filter((m) => m.method === "auto" || m.status === "confirmed") : [];
  const suggested = result ? result.matches.filter((m) => m.status === "pending_review") : [];
  const conciliadosCount = auto.length + (result?.groupMatches.length ?? 0);
  const pctConciliado = result && bankEntries.length ? (conciliadosCount / bankEntries.length) * 100 : 0;

  return (
    <section>
      <div className="tool-header">
        <div className="wrap">
          <h1>Conciliação Bancária Assistida</h1>
          <p>
            Anexe o extrato do banco e o relatório de contas pagas/recebidas enviado pelo cliente. O confronto por
            valor, data e descrição é automático — e você pode acionar a IA para desempatar os casos duvidosos antes
            de exportar a planilha final.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 8, paddingBottom: 40 }}>
        <section className="step">
          <div className="step-head">
            <span className="step-num">01</span>
            <div>
              <div className="step-title">Anexar arquivos</div>
              <p className="step-sub">Formatos aceitos: .xlsx, .xls, .csv, .pdf</p>
            </div>
          </div>

          <div className="grid2">
            <div>
              <div
                className="dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) void handleFile("banco", e.dataTransfer.files[0]);
                }}
              >
                <div className="dz-icon">B</div>
                <h3>Extrato bancário do cliente</h3>
                <p className="hint">Colunas típicas: data, histórico/descrição, valor (ou débito/crédito). PDF também é lido, uma linha por lançamento.</p>
                <input
                  ref={bancoInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFile("banco", e.target.files[0])}
                />
                <button className="btn secondary" type="button" onClick={() => bancoInputRef.current?.click()}>
                  Selecionar arquivo
                </button>
                {bancoFileName && (
                  <div className="file-chip" style={{ marginTop: 8 }}>
                    <span className="name">{bancoError ? "⚠️ " : "📄 "}{bancoFileName}</span>
                    <button type="button" onClick={() => removeFile("banco")}>✕</button>
                  </div>
                )}
                {bancoError && <p className="small-note" style={{ color: "var(--danger)" }}>{bancoError}</p>}
                {banco && <FilePreview file={banco} />}
                {banco?.pdfLines && banco.pdfLines.length > 0 && (
                  <>
                    <button className="btn secondary" type="button" style={{ marginTop: 8 }} disabled={bancoExtracting} onClick={() => handleAiExtract("banco")}>
                      {bancoExtracting ? "Extraindo..." : "✨ Extrair lançamentos com IA (layout não reconhecido?)"}
                    </button>
                    {bancoExtractStatus && <div className="status-line" style={{ marginTop: 6 }}>{bancoExtractStatus}</div>}
                  </>
                )}
              </div>
            </div>

            <div>
              <div
                className="dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) void handleFile("contas", e.dataTransfer.files[0]);
                }}
              >
                <div className="dz-icon" style={{ background: "var(--brass)" }}>C</div>
                <h3>Relatório de contas pagas/recebidas</h3>
                <p className="hint">Arquivo enviado pelo cliente. Colunas típicas: data, histórico, valor, tipo. PDF também é lido, uma linha por lançamento.</p>
                <input
                  ref={contasInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFile("contas", e.target.files[0])}
                />
                <button className="btn secondary" type="button" onClick={() => contasInputRef.current?.click()}>
                  Selecionar arquivo
                </button>
                {contasFileName && (
                  <div className="file-chip" style={{ marginTop: 8 }}>
                    <span className="name">{contasError ? "⚠️ " : "📄 "}{contasFileName}</span>
                    <button type="button" onClick={() => removeFile("contas")}>✕</button>
                  </div>
                )}
                {contasError && <p className="small-note" style={{ color: "var(--danger)" }}>{contasError}</p>}
                {contas && <FilePreview file={contas} />}
                {contas?.pdfLines && contas.pdfLines.length > 0 && (
                  <>
                    <button className="btn secondary" type="button" style={{ marginTop: 8 }} disabled={contasExtracting} onClick={() => handleAiExtract("contas")}>
                      {contasExtracting ? "Extraindo..." : "✨ Extrair lançamentos com IA (layout não reconhecido?)"}
                    </button>
                    {contasExtractStatus && <div className="status-line" style={{ marginTop: 6 }}>{contasExtractStatus}</div>}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={`step${ready ? "" : " locked"}`}>
          <div className="step-head">
            <span className="step-num">02</span>
            <div>
              <div className="step-title">Confirmar colunas</div>
              <p className="step-sub">A IA analisa o cabeçalho e a amostra do arquivo e já sugere o mapeamento — confira antes de rodar a conciliação.</p>
            </div>
          </div>

          <div className="grid2">
            <div className="map-card">
              <h4><span className="dz-icon" style={{ width: 22, height: 22, fontSize: 11, margin: 0 }}>B</span> Extrato bancário</h4>
              {banco && bancoMapping && (
                <>
                  <div className="field-row">
                    <label>Data</label>
                    <select value={bancoMapping.data} onChange={(e) => setBancoMapping({ ...bancoMapping, data: +e.target.value })}>
                      {banco.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Descrição</label>
                    <select value={bancoMapping.desc} onChange={(e) => setBancoMapping({ ...bancoMapping, desc: +e.target.value })}>
                      {banco.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                  <div className="toggle-row">
                    <input
                      type="checkbox"
                      id="banco-split"
                      checked={bancoMapping.split}
                      onChange={(e) => setBancoMapping({ ...bancoMapping, split: e.target.checked })}
                    />
                    <label htmlFor="banco-split">Valores em colunas separadas de débito/crédito</label>
                  </div>
                  {bancoMapping.split ? (
                    <div className="sub-fields">
                      <div className="field-row">
                        <label>Coluna Débito</label>
                        <select value={bancoMapping.debito} onChange={(e) => setBancoMapping({ ...bancoMapping, debito: +e.target.value })}>
                          <option value={-1}>— não usar —</option>
                          {banco.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>
                      <div className="field-row">
                        <label>Coluna Crédito</label>
                        <select value={bancoMapping.credito} onChange={(e) => setBancoMapping({ ...bancoMapping, credito: +e.target.value })}>
                          <option value={-1}>— não usar —</option>
                          {banco.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="field-row">
                      <label>Valor</label>
                      <select value={bancoMapping.valor} onChange={(e) => setBancoMapping({ ...bancoMapping, valor: +e.target.value })}>
                        {banco.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                    </div>
                  )}
                  {bancoAiStatus && <div className="status-line" style={{ marginTop: 10 }}>{bancoAiStatus}</div>}
                </>
              )}
            </div>

            <div className="map-card">
              <h4><span className="dz-icon" style={{ width: 22, height: 22, fontSize: 11, margin: 0, background: "var(--brass)" }}>C</span> Contas pagas/recebidas</h4>
              {contas && contasMapping && (
                <>
                  <div className="field-row">
                    <label>Data</label>
                    <select value={contasMapping.data} onChange={(e) => setContasMapping({ ...contasMapping, data: +e.target.value })}>
                      {contas.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Descrição</label>
                    <select value={contasMapping.desc} onChange={(e) => setContasMapping({ ...contasMapping, desc: +e.target.value })}>
                      {contas.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Valor</label>
                    <select value={contasMapping.valor} onChange={(e) => setContasMapping({ ...contasMapping, valor: +e.target.value })}>
                      {contas.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Coluna Tipo</label>
                    <select value={contasMapping.tipo} onChange={(e) => setContasMapping({ ...contasMapping, tipo: +e.target.value })}>
                      <option value={-1}>— não usar —</option>
                      {contas.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                  <div className="sub-fields">
                    <div className="field-row">
                      <label>Texto = Recebimento</label>
                      <input className="text-input" value={contasMapping.txtRec} onChange={(e) => setContasMapping({ ...contasMapping, txtRec: e.target.value })} />
                    </div>
                    <div className="field-row">
                      <label>Texto = Pagamento</label>
                      <input className="text-input" value={contasMapping.txtPag} onChange={(e) => setContasMapping({ ...contasMapping, txtPag: e.target.value })} />
                    </div>
                  </div>
                  {contasAiStatus && <div className="status-line" style={{ marginTop: 10 }}>{contasAiStatus}</div>}
                </>
              )}
            </div>
          </div>

          <div className="params">
            <div className="param">
              <label>Tolerância de valor (R$)</label>
              <input className="num-input" type="number" value={tol} step={0.01} min={0} onChange={(e) => setTol(+e.target.value)} />
              <p className="param-help">Diferença de centavos aceitável entre o valor do banco e o valor das contas para ainda considerar &quot;o mesmo valor&quot;.</p>
            </div>
            <div className="param">
              <label>Janela de datas (dias)</label>
              <input className="num-input" type="number" value={dayWindow} step={1} min={0} onChange={(e) => setDayWindow(+e.target.value)} />
              <p className="param-help">Quantos dias de diferença entre a data do banco e a data das contas ainda são aceitos.</p>
            </div>
            <div className="param">
              <label>Similaridade mínima p/ match automático</label>
              <input className="num-input" type="number" value={simThreshold} step={0.05} min={0} max={1} onChange={(e) => setSimThreshold(+e.target.value)} />
              <p className="param-help">Abaixo disso, o item vai para &quot;Sugestões&quot; para você confirmar.</p>
            </div>
          </div>

          <div className="btn-row">
            <button className="btn" onClick={handleReconcile} disabled={!ready}>Rodar conciliação</button>
            <span className="small-note">Nada é enviado para fora do navegador nesta etapa.</span>
          </div>
        </section>

        <section className={`step${result ? "" : " locked"}`}>
          <div className="step-head">
            <span className="step-num">03</span>
            <div>
              <div className="step-title">Resultado da conciliação</div>
              <p className="step-sub">Confira os casos automáticos, refine as sugestões com IA e exporte.</p>
            </div>
          </div>

          {result && (
            <>
              <div className="summary">
                <div className="kpi success"><div className="label">Conciliados</div><div className="value">{conciliadosCount}</div></div>
                <div className="kpi warn"><div className="label">Sugestões p/ revisar</div><div className="value">{suggested.length}</div></div>
                <div className="kpi danger"><div className="label">Pendentes (banco + contas)</div><div className="value">{result.pendBanco.length + result.pendContas.length}</div></div>
                <div className="kpi"><div className="label">% do extrato conciliado</div><div className="value">{pctConciliado.toFixed(0)}%</div></div>
              </div>

              <div className="tabs">
                {([
                  ["ok", "Conciliados"],
                  ["soma", "Somas"],
                  ["sug", "Sugestões"],
                  ["pend-banco", "Pendentes · Banco"],
                  ["pend-contas", "Pendentes · Contas"],
                ] as [Tab, string][]).map(([id, label]) => (
                  <button key={id} className={`tab-btn${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>{label}</button>
                ))}
              </div>

              {tab === "ok" && <MatchTable list={auto} matches={result.matches} withActions={false} />}
              {tab === "soma" && <GroupTable groups={result.groupMatches} />}
              {tab === "sug" && (
                <MatchTable
                  list={suggested}
                  matches={result.matches}
                  withActions
                  onAccept={confirmMatch}
                  onReject={rejectMatch}
                />
              )}
              {tab === "pend-banco" && <PendingTable list={result.pendBanco} />}
              {tab === "pend-contas" && <PendingTable list={result.pendContas} />}

              <div className="footer-actions">
                <div>
                  <button className="btn ai" disabled={aiRefining} onClick={handleRefine}>✨ Refinar sugestões com IA</button>
                  {aiRefineStatus && <span className="status-line" style={{ marginLeft: 10 }}>{aiRefineStatus}</span>}
                </div>
                <button className="btn" onClick={handleExport}>Exportar Excel (.xlsx)</button>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function MatchTable({
  list,
  matches,
  withActions,
  onAccept,
  onReject,
}: {
  list: Match[];
  matches: Match[];
  withActions: boolean;
  onAccept?: (idx: number) => void;
  onReject?: (idx: number) => void;
}) {
  if (list.length === 0) return <div className="empty-state">Nenhum item aqui.</div>;
  return (
    <table className="results">
      <thead>
        <tr>
          <th>Status</th><th>Banco</th><th>Contas</th><th>Valor</th>{withActions && <th>Ação</th>}
        </tr>
      </thead>
      <tbody>
        {list.map((m) => {
          const globalIdx = matches.indexOf(m);
          const stampClass = m.method === "ai" ? "ok" : m.score >= 0.6 ? "ok" : m.score >= 0.3 ? "mid" : "no";
          const stampLabel = m.status === "confirmed" ? "confirmado" : m.method === "ai" ? "ia" : m.method === "auto" ? "automático" : "revisar";
          return (
            <tr key={globalIdx}>
              <td><span className={`stamp ${stampClass}`}>{stampLabel}</span></td>
              <td className="desc"><span className="b">{fmtDate(m.bank.date)}</span><span className="l">{m.bank.desc}</span></td>
              <td className="desc"><span className="b">{fmtDate(m.ledger.date)}</span><span className="l">{m.ledger.desc}</span></td>
              <td className="num">{fmtMoney(m.bank.value)}</td>
              {withActions && (
                <td className="row-actions">
                  <button className="accept" onClick={() => onAccept?.(globalIdx)}>Confirmar</button>
                  <button className="reject" onClick={() => onReject?.(globalIdx)}>Rejeitar</button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GroupTable({ groups }: { groups: { bank: Entry; ledgers: Entry[] }[] }) {
  if (groups.length === 0) return <div className="empty-state">Nenhuma soma encontrada — todo lançamento fechou 1 para 1.</div>;
  return (
    <table className="results">
      <thead>
        <tr><th>Status</th><th>Banco</th><th>Contas (itens somados)</th><th>Valor</th></tr>
      </thead>
      <tbody>
        {groups.map((g, i) => (
          <tr key={i}>
            <td><span className="stamp ok">soma ({g.ledgers.length}x)</span></td>
            <td className="desc"><span className="b">{fmtDate(g.bank.date)}</span><span className="l">{g.bank.desc}</span></td>
            <td className="desc">
              {g.ledgers.map((l, li) => (
                <span key={li} className="l" style={{ display: "block" }}>{fmtDate(l.date)} · {l.desc} · {fmtMoney(l.value)}</span>
              ))}
            </td>
            <td className="num">{fmtMoney(g.bank.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PendingTable({ list }: { list: Entry[] }) {
  if (list.length === 0) return <div className="empty-state">Nada pendente aqui — tudo conciliado ✅</div>;
  return (
    <table className="results">
      <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead>
      <tbody>
        {list.map((e) => (
          <tr key={e.id}><td className="num">{fmtDate(e.date)}</td><td className="desc">{e.desc}</td><td className="num">{fmtMoney(e.value)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

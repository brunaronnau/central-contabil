"use client";

import { useState } from "react";
import { type Grupo, getAnos } from "@/lib/tributaria";
import { gerarPptxRelatorio } from "@/lib/tributaria-pptx";
import type { ViewKey } from "./TributariaClient";
import { RelatorioConteudo } from "./RelatorioConteudo";

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
  const [gerando, setGerando] = useState(false);

  async function handleExportarPptx() {
    setGerando(true);
    try {
      await gerarPptxRelatorio(grupo, ano);
    } catch (err) {
      alert(err instanceof Error ? `Erro ao gerar o PowerPoint: ${err.message}` : "Erro ao gerar o PowerPoint.");
    } finally {
      setGerando(false);
    }
  }

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

  return (
    <section className="at-view active">
      <div className="print-cover print-only">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/navecon-logo.png" alt="Navecon Contabilidade e Assessoria" className="print-cover-logo" />
        <div className="print-cover-rule" />
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

      <RelatorioConteudo grupo={grupo} ano={ano} />

      <div className="btn-row no-print nav-footer">
        <button className="btn secondary" onClick={() => onIrPara("dados")}>
          ← Anterior
        </button>
        <button className="btn secondary" onClick={handleExportarPptx} disabled={gerando}>
          {gerando ? "Gerando..." : "Exportar PowerPoint"}
        </button>
        <button className="btn" onClick={() => onIrPara("dashboard")}>
          Próximo →
        </button>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { type Atividade, type Empresa, type Grupo, PRESUNCAO, novaEmpresa } from "@/lib/tributaria";
import type { ViewKey } from "./TributariaClient";

const ATIVIDADES = Object.keys(PRESUNCAO) as Atividade[];

export function ViewSetup({
  grupo,
  onUpdateGrupo,
  onIrPara,
}: {
  grupo: Grupo;
  onUpdateGrupo: (mutator: (g: Grupo) => Grupo) => void;
  onIrPara: (v: ViewKey) => void;
}) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});

  function updateEmpresa(id: string, patch: Partial<Empresa>) {
    onUpdateGrupo((g) => ({ ...g, empresas: g.empresas.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  function addEmpresa() {
    const e = novaEmpresa();
    onUpdateGrupo((g) => ({ ...g, empresas: [...g.empresas, e] }));
    setAbertas((prev) => ({ ...prev, [e.id]: true }));
  }

  function removeEmpresa(id: string) {
    if (!confirm("Remover esta empresa e todos os dados mensais dela?")) return;
    onUpdateGrupo((g) => ({ ...g, empresas: g.empresas.filter((e) => e.id !== id) }));
  }

  return (
    <section className="at-view active">
      <div className="card">
        <h2>Dados do Grupo</h2>
        <div className="field-row">
          <label>Nome do grupo</label>
          <input className="text-input" value={grupo.grupoNome} onChange={(e) => onUpdateGrupo((g) => ({ ...g, grupoNome: e.target.value }))} />
        </div>
        <div className="field-row">
          <label>Responsável</label>
          <input className="text-input" value={grupo.grupoResponsavel} onChange={(e) => onUpdateGrupo((g) => ({ ...g, grupoResponsavel: e.target.value }))} />
        </div>
        <div className="field-row">
          <label title="Apenas informativo — não entra em nenhum cálculo">Data-base</label>
          <input type="date" className="text-input" value={grupo.grupoData} onChange={(e) => onUpdateGrupo((g) => ({ ...g, grupoData: e.target.value }))} />
        </div>
      </div>

      <div className="card">
        <h2>Empresas do Grupo</h2>
        {grupo.empresas.length === 0 && <div className="empty-state">Nenhuma empresa cadastrada ainda.</div>}
        {grupo.empresas.map((emp) => {
          const aberta = !!abertas[emp.id];
          return (
            <div key={emp.id} className={`company${aberta ? " open" : ""}`}>
              <div className="head" onClick={() => setAbertas((p) => ({ ...p, [emp.id]: !p[emp.id] }))}>
                <span>{emp.nome || "(empresa sem nome)"}</span>
                <span className="small-note">{aberta ? "▲" : "▼"}</span>
              </div>
              <div className="body">
                <div className="field-row">
                  <label>Nome</label>
                  <input className="text-input" value={emp.nome} onChange={(e) => updateEmpresa(emp.id, { nome: e.target.value })} />
                </div>
                <div className="field-row">
                  <label>CNPJ</label>
                  <input className="text-input" value={emp.cnpj} onChange={(e) => updateEmpresa(emp.id, { cnpj: e.target.value })} />
                </div>
                <div className="field-row">
                  <label>Regime Atual</label>
                  <select value={emp.regimeAtual} onChange={(e) => updateEmpresa(emp.id, { regimeAtual: e.target.value as Empresa["regimeAtual"] })}>
                    <option value="simples">Simples Nacional</option>
                    <option value="presumido">Lucro Presumido</option>
                    <option value="real">Lucro Real</option>
                  </select>
                </div>
                <div className="field-row">
                  <label>Prejuízo Fiscal Acumulado (R$)</label>
                  <input
                    type="number"
                    className="num-input"
                    value={emp.prejuizoInicial}
                    onChange={(e) => updateEmpresa(emp.id, { prejuizoInicial: +e.target.value || 0 })}
                  />
                </div>
                <div className="field-row">
                  <label>Atividade de Serviço</label>
                  <select value={emp.atividade} onChange={(e) => updateEmpresa(emp.id, { atividade: e.target.value as Atividade })}>
                    {ATIVIDADES.map((a) => (
                      <option key={a} value={a}>
                        {PRESUNCAO[a].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="user-del-btn" onClick={() => removeEmpresa(emp.id)}>
                    Remover Empresa
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="btn-row">
          <button className="btn secondary" onClick={addEmpresa}>
            + Adicionar Empresa
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Como o motor de cálculo apura cada tributo</h2>
        <ul className="assumptions">
          <li>Simples Nacional: valor mensal apurado informado diretamente (aba &quot;Apuração do Simples&quot;) — não recalculado internamente por Anexo.</li>
          <li>Presunção IRPJ/CSLL (Presumido): Receita de Comércio sempre 8%/12% (fixo); Receita de Serviço + Intercompany conforme a atividade selecionada por empresa.</li>
          <li>Receita mensal: dividida em Comércio, Serviço e Intercompany.</li>
          <li>IRPJ: 15% + adicional de 10% sobre o que exceder R$ 20.000/mês (no Lucro Real, acumulado no ano; no Presumido, testado mês a mês).</li>
          <li>CSLL: 9%.</li>
          <li>PIS/COFINS Presumido (cumulativo): 0,65% + 3,00%.</li>
          <li>PIS/COFINS Real: input manual de débito/crédito mensal (não-cumulativo, com saldo credor carregado).</li>
          <li>INSS Patronal: cálculo detalhado (GPS) só para Simples; manual para Presumido/Real.</li>
          <li>IPI, ICMS (inclusive TTD), ISS, Fundos: apurados por fora, informados na aba &quot;Impostos&quot;.</li>
          <li>CBS (Reforma Tributária): projeção de transição a 9,45% sobre o faturamento — validar periodicamente.</li>
          <li>Dados mensais: por ano-calendário ({new Date().getFullYear()} e adjacentes).</li>
        </ul>
      </div>

      <div className="btn-row no-print">
        <button className="btn secondary" onClick={() => onIrPara("grupos")}>
          ← Anterior
        </button>
        <button className="btn" onClick={() => onIrPara("dados")}>
          Próximo →
        </button>
      </div>
    </section>
  );
}

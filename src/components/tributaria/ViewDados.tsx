"use client";

import { Fragment, useState } from "react";
import { type Empresa, type Grupo, type MesesDados, LINHAS, MESES, SUBTAB_LABELS, criarMesesVazios, getAnos, getSubtabKeys, obterMeses } from "@/lib/tributaria";
import type { ViewKey } from "./TributariaClient";

function MonthsTable({
  meses,
  campos,
  onChange,
  onFill,
}: {
  meses: MesesDados;
  campos: { key: keyof MesesDados; label: string; header?: string }[];
  onChange: (key: keyof MesesDados, monthIndex: number, value: number) => void;
  onFill: (key: keyof MesesDados) => void;
}) {
  return (
    <table className="months">
      <thead>
        <tr>
          <th>Campo</th>
          {MESES.map((m) => (
            <th key={m}>{m}</th>
          ))}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {campos.map((campo) => (
          <Fragment key={campo.key}>
            {campo.header && (
              <tr className="section-header">
                <td colSpan={14}>{campo.header}</td>
              </tr>
            )}
            <tr>
              <td>{campo.label}</td>
              {meses[campo.key].map((v, i) => (
                <td key={i}>
                  <input type="number" step="0.01" value={v || ""} onChange={(e) => onChange(campo.key, i, +e.target.value || 0)} />
                </td>
              ))}
              <td>
                <button type="button" className="fill-btn" title="Replicar Jan para todos os meses" onClick={() => onFill(campo.key)}>
                  →
                </button>
              </td>
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

export function ViewDados({
  grupo,
  ano,
  onAno,
  onUpdateGrupo,
  onIrPara,
}: {
  grupo: Grupo;
  ano: number;
  onAno: (a: number) => void;
  onUpdateGrupo: (mutator: (g: Grupo) => Grupo) => void;
  onIrPara: (v: ViewKey) => void;
}) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const [subtabs, setSubtabs] = useState<Record<string, string>>({});

  function setMesesEmpresa(empresaId: string, mutator: (m: MesesDados) => MesesDados) {
    onUpdateGrupo((g) => ({
      ...g,
      empresas: g.empresas.map((e) => {
        if (e.id !== empresaId) return e;
        const atual = obterMeses(e, ano);
        return { ...e, anos: { ...e.anos, [ano]: mutator(atual) } };
      }),
    }));
  }

  function handleChange(empresaId: string, key: keyof MesesDados, monthIndex: number, value: number) {
    setMesesEmpresa(empresaId, (m) => {
      const arr = m[key].slice();
      arr[monthIndex] = value;
      return { ...m, [key]: arr };
    });
  }

  function handleFill(empresaId: string, key: keyof MesesDados) {
    setMesesEmpresa(empresaId, (m) => ({ ...m, [key]: new Array(12).fill(m[key][0]) }));
  }

  if (grupo.empresas.length === 0) {
    return (
      <section className="at-view active">
        <div className="empty-state">Cadastre ao menos uma empresa na aba &quot;1. Grupo &amp; Empresas&quot; antes de preencher dados mensais.</div>
        <div className="btn-row no-print">
          <button className="btn secondary" onClick={() => onIrPara("setup")}>
            ← Anterior
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="at-view active">
      <div className="card">
        <div className="field-row">
          <label>Ano de Referência</label>
          <select value={ano} onChange={(e) => onAno(+e.target.value)}>
            {getAnos().map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <p className="small-note">Cada ano é salvo separadamente — trocar o ano não apaga os dados já preenchidos em outro ano.</p>
      </div>

      {grupo.empresas.map((emp: Empresa) => {
        const aberta = !!abertas[emp.id];
        const subtabKeys = getSubtabKeys(emp.regimeAtual);
        const subtab = subtabs[emp.id] ?? subtabKeys[0];
        const meses = obterMeses(emp, ano) ?? criarMesesVazios();
        return (
          <div key={emp.id} className={`company${aberta ? " open" : ""}`}>
            <div className="head" onClick={() => setAbertas((p) => ({ ...p, [emp.id]: !p[emp.id] }))}>
              <span>{emp.nome || "(empresa sem nome)"}</span>
              <span className="small-note">{aberta ? "▲" : "▼"}</span>
            </div>
            <div className="body">
              <div className="subtabs">
                {subtabKeys.map((k) => (
                  <button key={k} type="button" className={subtab === k ? "active" : ""} onClick={() => setSubtabs((p) => ({ ...p, [emp.id]: k }))}>
                    {SUBTAB_LABELS[k]}
                  </button>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <MonthsTable
                  meses={meses}
                  campos={LINHAS[subtab]}
                  onChange={(key, i, v) => handleChange(emp.id, key, i, v)}
                  onFill={(key) => handleFill(emp.id, key)}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="btn-row no-print">
        <button className="btn secondary" onClick={() => onIrPara("setup")}>
          ← Anterior
        </button>
        <button className="btn" onClick={() => onIrPara("relatorio")}>
          Próximo →
        </button>
      </div>
    </section>
  );
}

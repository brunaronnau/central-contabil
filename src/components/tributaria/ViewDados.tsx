"use client";

import { Fragment, useState } from "react";
import {
  type Empresa,
  type Grupo,
  type LinhaCampo,
  type MesesDados,
  LINHAS,
  MESES,
  SUBTAB_LABELS,
  criarMesesVazios,
  getAnos,
  getSubtabKeys,
  obterMeses,
} from "@/lib/tributaria";
import type { ViewKey } from "./TributariaClient";
import { importarDeWorkbook, lerWorkbook } from "@/lib/tributaria-import";

function MonthsTable({
  meses,
  campos,
  onChange,
  onFill,
}: {
  meses: MesesDados;
  campos: LinhaCampo[];
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
            <tr className={campo.total ? "linha-total" : undefined}>
              <td>{campo.label}</td>
              {campo.total
                ? meses[campo.total.debito].map((_, i) => (
                    <td key={i}>
                      <input type="number" value={meses[campo.total!.debito][i] - meses[campo.total!.credito][i]} disabled />
                    </td>
                  ))
                : meses[campo.key].map((v, i) => (
                    <td key={i}>
                      <input type="number" step="0.01" value={v || ""} onChange={(e) => onChange(campo.key, i, +e.target.value || 0)} />
                    </td>
                  ))}
              <td>
                {!campo.total && (
                  <button type="button" className="fill-btn" title="Replicar Jan para todos os meses" onClick={() => onFill(campo.key)}>
                    →
                  </button>
                )}
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
  apresentacao,
  onToggleApresentacao,
}: {
  grupo: Grupo;
  ano: number;
  onAno: (a: number) => void;
  onUpdateGrupo: (mutator: (g: Grupo) => Grupo) => void;
  onIrPara: (v: ViewKey) => void;
  apresentacao: boolean;
  onToggleApresentacao: () => void;
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

  const [importStatus, setImportStatus] = useState<Record<string, string>>({});

  // Aceita vários arquivos de uma vez (ex.: um por ano). O ano de cada
  // planilha é detectado automaticamente pelo cabeçalho dela ("Jan-25",
  // "Jan-26"...); só cai no ano selecionado na tela quando não dá pra
  // detectar. Assim dá pra importar o histórico inteiro numa tacada só,
  // sem precisar trocar o seletor de "Ano de Referência" entre arquivos.
  async function handleImportar(empresaId: string, files: FileList) {
    setImportStatus((p) => ({ ...p, [empresaId]: `Lendo ${files.length > 1 ? `${files.length} planilhas` : "planilha"}...` }));
    try {
      const porAno: Record<number, Partial<MesesDados>> = {};
      const resumoPorAno: { ano: number; encontrados: string[] }[] = [];
      const semAnoDetectado: string[] = [];

      for (const file of Array.from(files)) {
        const wb = await lerWorkbook(file);
        const resultado = importarDeWorkbook(wb);
        if (resultado.ano === null) semAnoDetectado.push(file.name);
        if (resultado.encontrados.length === 0) continue;

        const anoAlvo = resultado.ano ?? ano;
        porAno[anoAlvo] = { ...porAno[anoAlvo], ...resultado.dados };
        const existente = resumoPorAno.find((r) => r.ano === anoAlvo);
        if (existente) existente.encontrados.push(...resultado.encontrados);
        else resumoPorAno.push({ ano: anoAlvo, encontrados: [...resultado.encontrados] });
      }

      if (resumoPorAno.length === 0) {
        setImportStatus((p) => ({ ...p, [empresaId]: "Não reconheci nenhum campo nas planilhas selecionadas — confirme se é o modelo padrão." }));
        return;
      }

      resumoPorAno.sort((a, b) => a.ano - b.ano);
      const msg =
        `${resumoPorAno.map((r) => `Ano ${r.ano}: ${r.encontrados.length} campo(s) encontrados`).join("\n")}\n\n` +
        (semAnoDetectado.length > 0
          ? `Não identifiquei o ano de: ${semAnoDetectado.join(", ")} — usei o ano selecionado na tela (${ano}) pra esse(s).\n\n`
          : "") +
        `Isso substitui os valores já preenchidos nesses campos, em cada ano listado. Continuar?`;
      if (!confirm(msg)) {
        setImportStatus((p) => ({ ...p, [empresaId]: "" }));
        return;
      }

      onUpdateGrupo((g) => ({
        ...g,
        empresas: g.empresas.map((e) => {
          if (e.id !== empresaId) return e;
          const novosAnos = { ...e.anos };
          for (const [anoStr, dadosAno] of Object.entries(porAno)) {
            const anoNum = Number(anoStr);
            novosAnos[anoNum] = { ...(novosAnos[anoNum] ?? criarMesesVazios()), ...dadosAno };
          }
          return { ...e, anos: novosAnos };
        }),
      }));

      const totalCampos = resumoPorAno.reduce((s, r) => s + r.encontrados.length, 0);
      setImportStatus((p) => ({
        ...p,
        [empresaId]: `Importado: ${totalCampos} campo(s) em ${resumoPorAno.length} ano(s) (${resumoPorAno.map((r) => r.ano).join(", ")}). Receita e LALUR não entram no import — confira e complete manualmente.`,
      }));
    } catch (err) {
      setImportStatus((p) => ({ ...p, [empresaId]: err instanceof Error ? err.message : "Erro ao importar a planilha." }));
    }
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
      <div className="btn-row no-print" style={{ justifyContent: "flex-end", marginBottom: 4 }}>
        <button className="btn secondary btn-modo-apresentacao" onClick={onToggleApresentacao}>
          {apresentacao ? "✕ Sair do Modo Apresentação" : "✶ Modo Apresentação"}
        </button>
      </div>

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
              <div className="btn-row no-print" style={{ marginBottom: 12, alignItems: "center" }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  id={`import-planilha-${emp.id}`}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) handleImportar(emp.id, files);
                    e.target.value = "";
                  }}
                />
                <label htmlFor={`import-planilha-${emp.id}`} className="btn secondary" style={{ cursor: "pointer" }}>
                  📥 Importar de Planilha(s)
                </label>
                {importStatus[emp.id] && <span className="small-note">{importStatus[emp.id]}</span>}
              </div>
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

"use client";

import { useState } from "react";

function fmtBRL(v: number): string {
  return (isNaN(v) ? 0 : v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DEFAULT_PCT = 30;

export default function EstoquePage() {
  const [ei, setEi] = useState("");
  const [compras, setCompras] = useState("");
  const [vendas, setVendas] = useState("");
  const [servicos, setServicos] = useState("");
  const [pct, setPct] = useState(String(DEFAULT_PCT));

  const x = (parseFloat(ei) || 0) + (parseFloat(compras) || 0);
  const y = (parseFloat(vendas) || 0) + (parseFloat(servicos) || 0);
  const a = y * ((parseFloat(pct) || 0) / 100);
  const ef = x - a;

  function limparCampos() {
    setEi("");
    setCompras("");
    setVendas("");
    setServicos("");
    setPct(String(DEFAULT_PCT));
  }

  return (
    <section>
      <div className="tool-header">
        <div className="wrap">
          <h1>Calculadora de Estoque</h1>
          <p>
            Use quando o cliente não envia controle de estoque. A partir do estoque inicial, das compras e do
            faturamento do período, a ferramenta estima o estoque final aplicando um percentual de custo sobre a
            receita.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 8, paddingBottom: 40 }}>
        <section className="step">
          <div className="step-head">
            <span className="step-num">01</span>
            <div>
              <div className="step-title">Dados do período</div>
              <p className="step-sub">Preencha após a importação das notas no fiscal. Valores em R$.</p>
            </div>
          </div>

          <div className="grid2">
            <div className="map-card">
              <h4>1º cálculo — Disponível para venda (X)</h4>
              <div className="field-row">
                <label>Estoque Inicial (EI)</label>
                <input type="number" className="num-input" placeholder="0,00" step="0.01" value={ei} onChange={(e) => setEi(e.target.value)} />
              </div>
              <div className="field-row">
                <label>Compras</label>
                <input type="number" className="num-input" placeholder="0,00" step="0.01" value={compras} onChange={(e) => setCompras(e.target.value)} />
              </div>
              <p className="small-note">X = EI + Compras. Pegue as informações no módulo contábil, depois da importação.</p>
            </div>

            <div className="map-card">
              <h4>2º cálculo — Faturamento do período (Y)</h4>
              <div className="field-row">
                <label>Total Vendas</label>
                <input type="number" className="num-input" placeholder="0,00" step="0.01" value={vendas} onChange={(e) => setVendas(e.target.value)} />
              </div>
              <div className="field-row">
                <label>Total Prest. Serviços</label>
                <input type="number" className="num-input" placeholder="0,00" step="0.01" value={servicos} onChange={(e) => setServicos(e.target.value)} />
              </div>
              <p className="small-note">Y = Total Vendas + Total Prestação de Serviços.</p>
            </div>
          </div>

          <div className="params">
            <div className="param">
              <label>% de custo sobre o faturamento</label>
              <input type="number" className="num-input" value={pct} step="1" min={0} max={100} onChange={(e) => setPct(e.target.value)} />
              <p className="param-help">
                3º cálculo: A = Y × %. Essa porcentagem pode variar conforme o ramo da empresa — ajuste conforme o
                histórico do cliente.
              </p>
            </div>
          </div>
        </section>

        <section className="step">
          <div className="step-head">
            <span className="step-num">02</span>
            <div>
              <div className="step-title">Estoque final estimado</div>
              <p className="step-sub">4º cálculo: EF = X − A. Atualiza automaticamente conforme os dados acima.</p>
            </div>
          </div>

          <div className="summary">
            <div className="kpi">
              <div className="label">X · Disponível p/ venda</div>
              <div className="value">{fmtBRL(x)}</div>
            </div>
            <div className="kpi">
              <div className="label">Y · Faturamento</div>
              <div className="value">{fmtBRL(y)}</div>
            </div>
            <div className="kpi warn">
              <div className="label">A · Custo estimado</div>
              <div className="value">{fmtBRL(a)}</div>
            </div>
            <div className={`kpi ${ef < 0 ? "danger" : "success"}`}>
              <div className="label">EF · Estoque final</div>
              <div className="value">{fmtBRL(ef)}</div>
            </div>
          </div>

          <div className="footer-actions">
            <span className="small-note">EI + Compras − (Faturamento × % de custo) = Estoque Final estimado.</span>
            <button className="btn secondary" type="button" onClick={limparCampos}>
              Limpar campos
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

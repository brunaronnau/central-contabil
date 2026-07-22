"use client";

import { useState } from "react";
import type { Grupo } from "@/lib/tributaria";
import type { ViewKey } from "./TributariaClient";

export function ViewGrupos({
  grupos,
  onCriar,
  onSelecionar,
  onExcluir,
  onIrPara,
}: {
  grupos: Grupo[];
  onCriar: (nome: string) => void;
  onSelecionar: (id: string) => void;
  onExcluir: (id: string) => void;
  onIrPara: (v: ViewKey) => void;
}) {
  const [nome, setNome] = useState("");

  return (
    <section className="at-view active">
      <div className="card">
        <h2>Criar Novo Grupo</h2>
        <div className="field-row" style={{ gridTemplateColumns: "1fr auto" }}>
          <input className="text-input" placeholder="Nome do grupo econômico" value={nome} onChange={(e) => setNome(e.target.value)} />
          <button
            className="btn"
            onClick={() => {
              onCriar(nome);
              setNome("");
            }}
          >
            Criar Grupo
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Grupos Já Cadastrados</h2>
        {grupos.length === 0 ? (
          <div className="empty-state">Nenhum grupo cadastrado ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {grupos.map((g) => (
              <div key={g.id} className="file-chip" style={{ padding: "10px 14px" }}>
                <span className="name" style={{ fontFamily: "var(--sans)", maxWidth: "none" }}>
                  {g.grupoNome} <span className="small-note">· {g.empresas.length} empresa(s)</span>
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => onSelecionar(g.id)}>
                    Selecionar
                  </button>
                  <button className="user-del-btn" onClick={() => onExcluir(g.id)}>
                    Excluir Grupo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="btn-row no-print">
        <button className="btn" onClick={() => onIrPara("setup")}>
          Próximo →
        </button>
      </div>
    </section>
  );
}

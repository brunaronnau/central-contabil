"use client";

import { useState } from "react";
import { editarFerias, excluirFerias } from "@/app/actions/lideranca";
import { ExcluirButton } from "./ExcluirButton";

export type FeriasItemData = {
  id: string;
  colaborador: string;
  dataInicio: string;
  dataFim: string;
  observacao: string | null;
  autor: string;
};

function fmtData(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function FeriasItem({ ferias }: { ferias: FeriasItemData }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <div className="lid-evento lid-evento-edit">
        <form
          action={async (formData) => {
            await editarFerias(ferias.id, formData);
            setEditando(false);
          }}
        >
          <div className="field-row">
            <label>Colaborador</label>
            <input className="text-input" name="colaborador" defaultValue={ferias.colaborador} required />
          </div>
          <div className="field-row">
            <label>Início</label>
            <input className="text-input" type="date" name="dataInicio" defaultValue={ferias.dataInicio.slice(0, 10)} required />
          </div>
          <div className="field-row">
            <label>Fim</label>
            <input className="text-input" type="date" name="dataFim" defaultValue={ferias.dataFim.slice(0, 10)} required />
          </div>
          <div className="field-row">
            <label>Observação</label>
            <input className="text-input" name="observacao" defaultValue={ferias.observacao ?? ""} />
          </div>
          <div className="btn-row">
            <button type="submit" className="btn">
              Salvar
            </button>
            <button type="button" className="btn secondary" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="lid-evento">
      <div className="lid-evento-data">
        {fmtData(ferias.dataInicio)} — {fmtData(ferias.dataFim)}
      </div>
      <div className="lid-evento-body">
        <div className="lid-evento-titulo">{ferias.colaborador}</div>
        {ferias.observacao && <div className="lid-evento-desc">{ferias.observacao}</div>}
        <div className="small-note">registrado por {ferias.autor}</div>
      </div>
      <div className="lid-evento-actions">
        <button type="button" className="btn secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => setEditando(true)}>
          Editar
        </button>
        <ExcluirButton action={excluirFerias.bind(null, ferias.id)} confirmMsg="Excluir este período de férias programado?" />
      </div>
    </div>
  );
}

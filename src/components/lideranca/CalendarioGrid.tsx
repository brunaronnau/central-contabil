"use client";

import { useState } from "react";
import { excluirEvento } from "@/app/actions/lideranca";
import { ExcluirButton } from "./ExcluirButton";

export type EventoGrid = {
  id: string;
  dia: number;
  mes: number;
  ano: number;
  titulo: string;
  descricao: string | null;
  autor: string;
};

export type FeriasGrid = {
  id: string;
  colaborador: string;
  inicio: string;
  fim: string;
};

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarioGrid({ eventos, ferias }: { eventos: EventoGrid[]; ferias: FeriasGrid[] }) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getUTCMonth());
  const [ano, setAno] = useState(hoje.getUTCFullYear());

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno -= 1;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno += 1;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  function irParaHoje() {
    setMes(hoje.getUTCMonth());
    setAno(hoje.getUTCFullYear());
  }

  const primeiroDiaSemana = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

  const eventosPorDia = new Map<number, EventoGrid[]>();
  for (const e of eventos) {
    if (e.ano === ano && e.mes === mes) {
      const lista = eventosPorDia.get(e.dia) ?? [];
      lista.push(e);
      eventosPorDia.set(e.dia, lista);
    }
  }

  const feriasRanges = ferias.map((f) => ({ ...f, inicioTs: new Date(f.inicio).getTime(), fimTs: new Date(f.fim).getTime() }));
  const feriasPorDia = new Map<number, FeriasGrid[]>();
  for (let d = 1; d <= diasNoMes; d++) {
    const ts = Date.UTC(ano, mes, d);
    const doDia = feriasRanges.filter((f) => ts >= f.inicioTs && ts <= f.fimTs);
    if (doDia.length > 0) feriasPorDia.set(d, doDia);
  }

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);

  const ehHoje = (dia: number) => ano === hoje.getUTCFullYear() && mes === hoje.getUTCMonth() && dia === hoje.getUTCDate();

  return (
    <div className="lid-cal">
      <div className="lid-cal-nav">
        <button type="button" className="btn secondary" style={{ padding: "5px 12px" }} onClick={() => mudarMes(-1)}>
          ← Anterior
        </button>
        <span className="lid-cal-titulo">
          {MESES[mes]} {ano}
        </span>
        <button type="button" className="btn secondary" style={{ padding: "5px 12px" }} onClick={irParaHoje}>
          Hoje
        </button>
        <button type="button" className="btn secondary" style={{ padding: "5px 12px" }} onClick={() => mudarMes(1)}>
          Próximo →
        </button>
      </div>

      <div className="lid-cal-grid">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="lid-cal-diasemana">
            {d}
          </div>
        ))}
        {celulas.map((dia, i) => (
          <div key={i} className={`lid-cal-dia${dia === null ? " vazio" : ""}${dia !== null && ehHoje(dia) ? " hoje" : ""}`}>
            {dia !== null && (
              <>
                <div className="lid-cal-numero">{dia}</div>
                <div className="lid-cal-eventos">
                  {(feriasPorDia.get(dia) ?? []).map((f) => (
                    <div key={f.id} className="lid-cal-ferias" title={`Férias: ${f.colaborador}`}>
                      <span className="lid-cal-evento-titulo">🏖 {f.colaborador}</span>
                    </div>
                  ))}
                  {(eventosPorDia.get(dia) ?? []).map((e) => (
                    <div key={e.id} className="lid-cal-evento" title={e.descricao ?? e.titulo}>
                      <span className="lid-cal-evento-titulo">{e.titulo}</span>
                      <ExcluirButton action={excluirEvento.bind(null, e.id)} confirmMsg="Excluir esta observação do calendário?" label="×" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

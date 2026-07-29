"use client";

import type { EmpresaData } from "./EmpresaCard";
import { escreverEmpresaNoPdf } from "./pdf";

export type GrupoParaExportar = {
  nome: string;
  dataEntrada: string;
  dataSaida: string;
  contabilidadeAnteriorNome: string | null;
  contabilidadeAnteriorCelular: string | null;
  contabilidadeAnteriorEmail: string | null;
  contabilidadeNovaNome: string | null;
  contabilidadeNovaCelular: string | null;
  contabilidadeNovaEmail: string | null;
  empresas: EmpresaData[];
};

function fmtData(iso: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function ExportGrupoButton({ grupo }: { grupo: GrupoParaExportar }) {
  async function handleExport() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    let y = 20;
    doc.setFontSize(16);
    doc.text(`Ficha Informativa — ${grupo.nome}`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, y);
    y += 10;

    doc.setFontSize(10.5);
    if (grupo.dataEntrada) {
      doc.text(`Data de entrada: ${fmtData(grupo.dataEntrada)}`, 14, y);
      y += 5;
    }
    if (grupo.contabilidadeAnteriorNome || grupo.contabilidadeAnteriorCelular || grupo.contabilidadeAnteriorEmail) {
      doc.text(
        `Contabilidade anterior: ${[grupo.contabilidadeAnteriorNome, grupo.contabilidadeAnteriorCelular, grupo.contabilidadeAnteriorEmail].filter(Boolean).join(" — ")}`,
        14,
        y,
      );
      y += 5;
    }
    if (grupo.dataSaida) {
      doc.text(`Data de saída: ${fmtData(grupo.dataSaida)}`, 14, y);
      y += 5;
    }
    if (grupo.contabilidadeNovaNome || grupo.contabilidadeNovaCelular || grupo.contabilidadeNovaEmail) {
      doc.text(
        `Nova contabilidade: ${[grupo.contabilidadeNovaNome, grupo.contabilidadeNovaCelular, grupo.contabilidadeNovaEmail].filter(Boolean).join(" — ")}`,
        14,
        y,
      );
      y += 5;
    }
    y += 6;

    if (grupo.empresas.length === 0) {
      doc.setFontSize(11);
      doc.text("Nenhuma empresa cadastrada neste grupo.", 14, y);
    }

    for (const emp of grupo.empresas) {
      y = escreverEmpresaNoPdf(doc, y, emp);
    }

    doc.save(`ficha_${grupo.nome.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <button type="button" className="btn secondary" onClick={handleExport}>
      Baixar PDF do Grupo
    </button>
  );
}

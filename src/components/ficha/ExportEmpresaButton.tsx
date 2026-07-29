"use client";

import type { EmpresaData } from "./EmpresaCard";
import { escreverEmpresaNoPdf } from "./pdf";

export function ExportEmpresaButton({ grupoNome, empresa }: { grupoNome: string; empresa: EmpresaData }) {
  async function handleExport() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    let y = 20;
    doc.setFontSize(16);
    doc.text(empresa.nome || "(empresa sem nome)", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Grupo: ${grupoNome} · Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, y);
    y += 10;

    escreverEmpresaNoPdf(doc, y, empresa);

    doc.save(`ficha_${(empresa.nome || "empresa").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <button type="button" className="btn secondary" onClick={handleExport}>
      Baixar PDF da Empresa
    </button>
  );
}

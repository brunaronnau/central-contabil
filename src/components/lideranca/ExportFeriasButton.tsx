"use client";

export type FeriasParaExportar = {
  colaborador: string;
  dataInicio: string;
  dataFim: string;
  observacao: string | null;
};

function fmtDataStr(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function ExportFeriasButton({ ferias }: { ferias: FeriasParaExportar[] }) {
  async function handleExport() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    let y = 20;
    doc.setFontSize(16);
    doc.text("Controle de Férias — Navecon", 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, y);
    y += 12;

    if (ferias.length === 0) {
      doc.setFontSize(12);
      doc.text("Nenhuma férias programada.", 14, y);
    }

    ferias.forEach((f) => {
      doc.setFontSize(12);
      doc.text(`${f.colaborador} — ${fmtDataStr(f.dataInicio)} até ${fmtDataStr(f.dataFim)}`, 14, y);
      y += 6;
      if (f.observacao) {
        doc.setFontSize(9);
        const linhas = doc.splitTextToSize(f.observacao, 180);
        doc.text(linhas, 18, y);
        y += linhas.length * 5;
      }
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`ferias_programadas_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <button type="button" className="btn secondary" onClick={handleExport}>
      Baixar Relatório (PDF)
    </button>
  );
}

"use client";

export type PollForExport = {
  titulo: string;
  authorName: string;
  fechada: boolean;
  opcoes: { texto: string; votantes: string[] }[];
};

export function ExportPollButton({ poll }: { poll: PollForExport }) {
  async function handleExport() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const totalVotos = poll.opcoes.reduce((s, o) => s + o.votantes.length, 0);

    let y = 20;
    doc.setFontSize(16);
    doc.text(poll.titulo, 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Autor: ${poll.authorName}`, 14, y);
    y += 6;
    doc.text(`Status: ${poll.fechada ? "Encerrada" : "Aberta"}`, 14, y);
    y += 6;
    doc.text(`Total de votos: ${totalVotos}`, 14, y);
    y += 10;

    poll.opcoes.forEach((op) => {
      const pct = totalVotos > 0 ? Math.round((op.votantes.length / totalVotos) * 100) : 0;
      doc.setFontSize(12);
      doc.text(`${op.texto} — ${op.votantes.length} voto(s) (${pct}%)`, 14, y);
      y += 6;
      doc.setFontSize(9);
      if (op.votantes.length > 0) {
        const linha = op.votantes.join(", ");
        const linhasQuebradas = doc.splitTextToSize(linha, 180);
        doc.text(linhasQuebradas, 18, y);
        y += linhasQuebradas.length * 5;
      } else {
        doc.text("(ninguém votou)", 18, y);
        y += 5;
      }
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    const slug = poll.titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 40);
    const nomeArquivo = `votacao_${slug}.pdf`;
    doc.save(nomeArquivo);
  }

  return (
    <button type="button" className="poll-pdf" onClick={handleExport}>
      Exportar PDF
    </button>
  );
}

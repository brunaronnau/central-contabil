import type { jsPDF } from "jspdf";
import type { EmpresaData } from "./EmpresaCard";

const LOCAL_DOCS_LABEL: Record<string, string> = {
  AC_DOCS: "AC Docs",
  NEXTCLOUD: "Nextcloud",
  CAPSULA: "Cápsula",
  OUTRO: "Outro",
};

function fmtData(iso: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function quebraPagina(doc: jsPDF, y: number): number {
  if (y > 270) {
    doc.addPage();
    return 20;
  }
  return y;
}

/** Escreve o bloco completo de uma empresa (dados + históricos) a partir de yInicial, com quebra de página automática. Retorna o y final. */
export function escreverEmpresaNoPdf(doc: jsPDF, yInicial: number, emp: EmpresaData): number {
  let y = yInicial;
  y = quebraPagina(doc, y);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(emp.nome || "(empresa sem nome)", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;

  doc.setFontSize(9.5);
  const localDoc = emp.localDocumentos === "OUTRO" && emp.localDocumentosOutro ? emp.localDocumentosOutro : LOCAL_DOCS_LABEL[emp.localDocumentos];
  const contato = [emp.contatoNome, emp.contatoTelefone].filter(Boolean).join(" — ");
  const linhasBasicas = [
    emp.cnpj ? `CNPJ: ${emp.cnpj}` : null,
    `Documentos mensais: ${localDoc}`,
    contato ? `Contato na empresa: ${contato}` : null,
    emp.semMovimentacao ? `Sem movimentação (confirmado em ${fmtData(emp.semMovimentacaoConfirmadoEm) || "—"})` : null,
  ].filter((l): l is string => !!l);
  for (const linha of linhasBasicas) {
    y = quebraPagina(doc, y);
    doc.text(linha, 14, y);
    y += 5;
  }

  const blocos: { titulo: string; linhas: string[] }[] = [
    {
      titulo: "Histórico de tributação",
      linhas: emp.tributacoes.map((t) => `${t.regime} — ${fmtData(t.dataInicio)} até ${t.dataFim ? fmtData(t.dataFim) : "atual"}`),
    },
    {
      titulo: "Analista responsável",
      linhas: emp.analistas.map((a) => `${a.nomeAnalista} — ${fmtData(a.dataInicio)} até ${a.dataFim ? fmtData(a.dataFim) : "atual"}`),
    },
    {
      titulo: "Anexos",
      linhas: emp.anexos.map((a) => `${a.semMovimentacao ? "[sem movimentação] " : ""}${a.nome}${a.observacao ? ` — ${a.observacao}` : ""}`),
    },
    {
      titulo: "Observações",
      linhas: emp.observacoes.map((o) => `${new Date(o.createdAt).toLocaleDateString("pt-BR")} (${o.autor}): ${o.texto}`),
    },
  ];

  for (const bloco of blocos) {
    if (bloco.linhas.length === 0) continue;
    y += 2;
    y = quebraPagina(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${bloco.titulo}:`, 14, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    for (const linha of bloco.linhas) {
      y = quebraPagina(doc, y);
      const partida = doc.splitTextToSize(`• ${linha}`, 178);
      doc.text(partida, 18, y);
      y += partida.length * 5;
    }
  }

  return y + 8;
}

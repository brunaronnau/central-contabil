import { prisma } from "@/lib/prisma";
import { alternarStatusNota, criarNota, excluirNota } from "@/app/actions/lideranca";
import { ExcluirButton } from "./ExcluirButton";

export async function NotasSection() {
  const notas = await prisma.liderancaNota.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return (
    <section className="lid-view active">
      <div className="card">
        <h2>Nova Observação ou Meta</h2>
        <form action={criarNota}>
          <div className="field-row">
            <label>Tipo</label>
            <select name="tipo" defaultValue="OBSERVACAO">
              <option value="OBSERVACAO">Observação</option>
              <option value="META">Meta</option>
            </select>
          </div>
          <div className="field-row">
            <label>Título</label>
            <input className="text-input" name="titulo" required placeholder="Ex.: Alinhamento sobre a equipe X" />
          </div>
          <div className="field-row">
            <label>Detalhes</label>
            <textarea name="texto" required rows={3} placeholder="Descreva a observação ou a meta combinada entre a liderança..." />
          </div>
          <div className="btn-row">
            <button className="btn" type="submit">
              Registrar
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Histórico</h2>
        {notas.length === 0 ? (
          <div className="empty-state">Nenhuma observação ou meta registrada ainda.</div>
        ) : (
          <div className="lid-nota-list">
            {notas.map((n) => (
              <div key={n.id} className={`lid-nota${n.status === "CONCLUIDA" ? " concluida" : ""}`}>
                <div className="lid-nota-head">
                  <span className={`lid-nota-tipo ${n.tipo.toLowerCase()}`}>{n.tipo === "META" ? "Meta" : "Observação"}</span>
                  <span className="lid-nota-titulo">{n.titulo}</span>
                  {n.tipo === "META" && (
                    <span className={`lid-nota-status ${n.status.toLowerCase()}`}>{n.status === "CONCLUIDA" ? "Concluída" : "Em aberto"}</span>
                  )}
                </div>
                <p className="lid-nota-texto">{n.texto}</p>
                <div className="lid-nota-footer">
                  <span className="small-note">
                    {n.author?.name ?? "Usuário removido"} · {n.createdAt.toLocaleDateString("pt-BR")} às{" "}
                    {n.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="lid-nota-actions">
                    {n.tipo === "META" && (
                      <form action={alternarStatusNota.bind(null, n.id)}>
                        <button type="submit" className="btn secondary" style={{ padding: "5px 10px", fontSize: 12 }}>
                          {n.status === "CONCLUIDA" ? "Reabrir" : "Marcar concluída"}
                        </button>
                      </form>
                    )}
                    <ExcluirButton action={excluirNota.bind(null, n.id)} confirmMsg="Excluir este registro? Essa ação não pode ser desfeita." />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

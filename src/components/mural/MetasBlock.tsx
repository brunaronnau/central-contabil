import { prisma } from "@/lib/prisma";
import type { requireUser } from "@/lib/session";
import { addMetaNote, alertMeta, concludeMeta, createMeta, deleteMeta } from "@/app/actions/mural-metas";

export async function MetasBlock({ me }: { me: Awaited<ReturnType<typeof requireUser>> }) {
  const metasRaw = await prisma.meta.findMany({
    include: { author: true, notas: { include: { author: true }, orderBy: { createdAt: "asc" } } },
  });

  const metas = metasRaw.sort((a, b) => {
    if (a.status !== b.status) return a.status === "ABERTA" ? -1 : 1;
    if (a.status === "ABERTA") return a.endDate.getTime() - b.endDate.getTime();
    return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="mural-block">
      <div className="mural-block-head">
        <h2>Metas</h2>
        <span className="small-note">{metas.filter((m) => m.status === "ABERTA").length} aberta(s)</span>
      </div>

      <details>
        <summary className="btn secondary" style={{ display: "inline-block", marginBottom: 16, cursor: "pointer" }}>
          + Nova meta
        </summary>
        <form action={createMeta} className="mural-form open">
          <div className="mural-form-row">
            <label htmlFor="meta-titulo">Título</label>
            <input id="meta-titulo" type="text" name="titulo" required maxLength={200} />
          </div>
          <div className="mural-form-row">
            <label htmlFor="meta-descricao">Descrição</label>
            <textarea id="meta-descricao" name="descricao" maxLength={2000} />
          </div>
          <div className="mural-form-grid">
            <div className="mural-form-row">
              <label htmlFor="meta-start">Início (opcional)</label>
              <input id="meta-start" type="date" name="startDate" />
            </div>
            <div className="mural-form-row">
              <label htmlFor="meta-end">Prazo</label>
              <input id="meta-end" type="date" name="endDate" required />
            </div>
          </div>
          <div className="mural-form-row">
            <label htmlFor="meta-reward">Recompensa (opcional)</label>
            <input id="meta-reward" type="text" name="reward" maxLength={200} />
          </div>
          <div className="mural-form-actions">
            <button type="submit" className="btn">
              Criar meta
            </button>
          </div>
        </form>
      </details>

      {metas.length === 0 ? (
        <div className="empty-state">Nenhuma meta cadastrada ainda.</div>
      ) : (
        <div className="goal-list">
          {metas.map((m) => {
            const canManage = me.isAdmin || m.authorId === me.id;
            const atrasada = m.status === "ABERTA" && m.endDate < hoje;
            return (
              <div key={m.id} className={`goal-card${m.status === "CONCLUIDA" ? " done" : ""}`}>
                <div className="goal-head">
                  <h3 className="goal-title">{m.titulo}</h3>
                  <span className={`goal-badge-status ${m.status === "CONCLUIDA" ? "concluida" : "aberta"}`}>
                    {m.status === "CONCLUIDA" ? "concluída" : atrasada ? "atrasada" : "aberta"}
                  </span>
                </div>
                {m.descricao && <p className="goal-desc">{m.descricao}</p>}
                <div className="goal-meta-row">
                  <span>
                    <b>Prazo:</b> {m.endDate.toLocaleDateString("pt-BR")}
                  </span>
                  <span>
                    <b>Responsável:</b> {m.author?.name ?? "Usuário removido"}
                  </span>
                </div>
                {m.reward && <div className="goal-reward">🎁 {m.reward}</div>}

                {m.notas.length > 0 && (
                  <div className="goal-notes">
                    {m.notas.map((n) => (
                      <div key={n.id} className={`goal-note tipo-${n.tipo.toLowerCase()}`}>
                        <div className="gn-meta">
                          {n.author?.name ?? "Usuário removido"} · {n.createdAt.toLocaleDateString("pt-BR")}
                        </div>
                        {n.text}
                      </div>
                    ))}
                  </div>
                )}

                <form action={addMetaNote.bind(null, m.id)} className="goal-note-form">
                  <input type="text" name="text" placeholder="Adicionar observação..." maxLength={500} />
                  <button type="submit" className="btn secondary" style={{ padding: "7px 14px", fontSize: 12 }}>
                    Comentar
                  </button>
                </form>

                {canManage && (
                  <div className="goal-actions">
                    {m.status === "ABERTA" && (
                      <form action={concludeMeta.bind(null, m.id)}>
                        <button type="submit" className="btn">
                          Concluir
                        </button>
                      </form>
                    )}
                    {m.status === "ABERTA" && (
                      <form action={alertMeta.bind(null, m.id)}>
                        <button type="submit" className="btn alert-btn">
                          Disparar alerta
                        </button>
                      </form>
                    )}
                    <form action={deleteMeta.bind(null, m.id)}>
                      <button type="submit" className="btn secondary">
                        Excluir
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

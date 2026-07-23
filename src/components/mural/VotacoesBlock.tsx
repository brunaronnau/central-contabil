import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createVotacao, deleteVotacao, voteVotacao } from "@/app/actions/mural-votacoes";
import { ExportPollButton } from "./ExportPollButton";

export async function VotacoesBlock() {
  const me = await requireUser();
  const votacoes = await prisma.votacao.findMany({
    include: { author: true, opcoes: { orderBy: { ordem: "asc" }, include: { votos: { include: { user: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mural-block">
      <div className="mural-block-head">
        <h2>Votações</h2>
        <span className="small-note">{votacoes.length} no total</span>
      </div>

      <details>
        <summary className="btn secondary" style={{ display: "inline-block", marginBottom: 16, cursor: "pointer" }}>
          + Nova votação
        </summary>
        <form action={createVotacao} className="mural-form open">
          <div className="mural-form-row">
            <label htmlFor="poll-titulo">Pergunta</label>
            <input id="poll-titulo" type="text" name="titulo" required maxLength={200} />
          </div>
          <div className="mural-form-row">
            <label>Opções (mín. 2)</label>
            <div className="mural-poll-options">
              <input type="text" name="opcoes" placeholder="Opção 1" required className="text-input" />
              <input type="text" name="opcoes" placeholder="Opção 2" required className="text-input" />
              <input type="text" name="opcoes" placeholder="Opção 3 (opcional)" className="text-input" />
              <input type="text" name="opcoes" placeholder="Opção 4 (opcional)" className="text-input" />
              <input type="text" name="opcoes" placeholder="Opção 5 (opcional)" className="text-input" />
              <input type="text" name="opcoes" placeholder="Opção 6 (opcional)" className="text-input" />
            </div>
          </div>
          <div className="mural-form-row">
            <label htmlFor="poll-duration">Encerra em</label>
            <select id="poll-duration" name="duration" defaultValue={72}>
              <option value={24}>1 dia</option>
              <option value={72}>3 dias</option>
              <option value={168}>7 dias</option>
              <option value={336}>14 dias</option>
            </select>
          </div>
          <div className="mural-form-actions">
            <button type="submit" className="btn">
              Publicar votação
            </button>
          </div>
        </form>
      </details>

      {votacoes.length === 0 ? (
        <div className="empty-state">Nenhuma votação criada ainda.</div>
      ) : (
        <div className="poll-list">
          {votacoes.map((p) => {
            const fechada = p.encerraEm <= new Date();
            const totalVotos = p.opcoes.reduce((s, o) => s + o.votos.length, 0);
            const meuVoto = p.opcoes.find((o) => o.votos.some((v) => v.userId === me.id))?.id;
            const canManage = me.isAdmin || p.authorId === me.id;

            return (
              <div key={p.id} className={`poll-card${fechada ? " closed" : ""}`}>
                <div className="poll-head">
                  <h3 className="poll-title">{p.titulo}</h3>
                  <span className={`poll-status ${fechada ? "closed-tag" : "open"}`}>{fechada ? "Encerrada" : "Aberta"}</span>
                </div>
                <div className="poll-meta">
                  {p.author.name} · {totalVotos} voto(s) · {fechada ? "encerrada em" : "encerra em"} {p.encerraEm.toLocaleDateString("pt-BR")}
                </div>
                <div className="poll-options">
                  {p.opcoes.map((op) => {
                    const pct = totalVotos > 0 ? Math.round((op.votos.length / totalVotos) * 100) : 0;
                    const votou = meuVoto === op.id;
                    return (
                      <div key={op.id} className="poll-opt-wrap">
                        <form action={voteVotacao.bind(null, p.id, op.id)}>
                          <button type="submit" disabled={fechada} className={`poll-opt${votou ? " voted" : ""}${fechada ? " closed" : ""}`} style={{ width: "100%", textAlign: "left" }}>
                            <span className="poll-opt-fill" style={{ width: `${pct}%` }}></span>
                            <span className="poll-opt-row">
                              <span className="txt">
                                {votou && "✓ "}
                                {op.texto}
                              </span>
                              <span className="pct">
                                {op.votos.length} · {pct}%
                              </span>
                            </span>
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
                <div className="poll-footer">
                  <div className="poll-footer-actions">
                    <ExportPollButton
                      poll={{
                        titulo: p.titulo,
                        authorName: p.author.name,
                        fechada,
                        opcoes: p.opcoes.map((o) => ({ texto: o.texto, votantes: o.votos.map((v) => v.user.name) })),
                      }}
                    />
                  </div>
                  {canManage && (
                    <form action={deleteVotacao.bind(null, p.id)}>
                      <button type="submit" className="poll-del">
                        excluir
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

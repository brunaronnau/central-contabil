import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  createSuggestion,
  deleteSuggestion,
  setSuggestionStatus,
  voteSuggestion,
} from "@/app/actions/suggestions";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function SugestoesPage() {
  const me = await requireUser();

  const suggestions = await prisma.suggestion.findMany({
    include: { author: { select: { name: true, photo: true } }, votes: true },
  });

  const scored = suggestions
    .map((s) => {
      const up = s.votes.filter((v) => v.value === 1).length;
      const down = s.votes.filter((v) => v.value === -1).length;
      const myVote = s.votes.find((v) => v.userId === me.id)?.value ?? 0;
      return { ...s, up, down, score: up - down, myVote };
    })
    .sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <section>
      <div className="tool-header">
        <div className="wrap">
          <h1>Sugestões</h1>
          <p>Proponha melhorias para a Central e para a Navecon, e vote nas ideias dos colegas.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}>
        <form action={createSuggestion} className="sugestao-form">
          <textarea name="text" placeholder="Qual sua sugestão?" required maxLength={2000} />
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn">
              Enviar sugestão
            </button>
          </div>
        </form>

        {scored.length === 0 ? (
          <div className="empty-state">Nenhuma sugestão ainda. Seja o primeiro a propor algo!</div>
        ) : (
          <div className="sugestao-list">
            {scored.map((s) => {
              const canDelete = me.isAdmin || s.authorId === me.id;
              const date = s.createdAt.toLocaleDateString("pt-BR");
              return (
                <div key={s.id} className={`sugestao-card status-${s.status.toLowerCase()}`}>
                  <div className="avatar">
                    {s.author.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.author.photo} alt="" />
                    ) : (
                      initials(s.author.name)
                    )}
                  </div>
                  <div className="sugestao-body">
                    <div className="sugestao-top">
                      <span className="sugestao-author">{s.author.name}</span>
                      <span className="sugestao-time">{date}</span>
                      {s.status === "ANDAMENTO" && (
                        <span className="sugestao-status-tag andamento">Em andamento</span>
                      )}
                      {s.status === "FEITO" && <span className="sugestao-status-tag feito">Feito</span>}
                    </div>
                    <p className="sugestao-text">{s.text}</p>
                    <div className="sugestao-footer">
                      <div className="recado-reactions" style={{ display: "flex", gap: 6 }}>
                        <form action={voteSuggestion.bind(null, s.id, 1)}>
                          <button type="submit" className={`reaction-btn ${s.myVote === 1 ? "on" : ""}`}>
                            👍 <span className="rc-count">{s.up}</span>
                          </button>
                        </form>
                        <form action={voteSuggestion.bind(null, s.id, -1)}>
                          <button type="submit" className={`reaction-btn ${s.myVote === -1 ? "on" : ""}`}>
                            👎 <span className="rc-count">{s.down}</span>
                          </button>
                        </form>
                      </div>

                      {me.isAdmin && (
                        <div className="sugestao-status-controls">
                          <span className="ssc-label">Marcar:</span>
                          <form action={setSuggestionStatus.bind(null, s.id, "ANDAMENTO")}>
                            <button
                              type="submit"
                              className={`${s.status === "ANDAMENTO" ? "active andamento" : ""}`}
                            >
                              Em andamento
                            </button>
                          </form>
                          <form action={setSuggestionStatus.bind(null, s.id, "FEITO")}>
                            <button type="submit" className={`${s.status === "FEITO" ? "active feito" : ""}`}>
                              Feito
                            </button>
                          </form>
                        </div>
                      )}

                      {canDelete && (
                        <div className="sugestao-actions">
                          <form action={deleteSuggestion.bind(null, s.id)}>
                            <button type="submit" className="sugestao-del">
                              excluir
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

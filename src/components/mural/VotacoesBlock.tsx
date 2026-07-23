import { prisma } from "@/lib/prisma";
import type { requireUser } from "@/lib/session";
import { deleteVotacao, voteVotacao } from "@/app/actions/mural-votacoes";
import { ExportPollButton } from "./ExportPollButton";
import { NovaVotacaoForm } from "./NovaVotacaoForm";
import { ConfirmForm } from "./ConfirmForm";

function fmtDataHora(d: Date): string {
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export async function VotacoesBlock({ me }: { me: Awaited<ReturnType<typeof requireUser>> }) {
  const votacoesRaw = await prisma.votacao.findMany({
    include: { author: true, opcoes: { orderBy: { ordem: "asc" }, include: { votos: { include: { user: true } } } } },
  });

  const now = new Date().getTime();
  const votacoes = votacoesRaw.sort((a, b) => {
    const aClosed = now >= a.encerraEm.getTime();
    const bClosed = now >= b.encerraEm.getTime();
    if (aClosed !== bClosed) return aClosed ? 1 : -1;
    return aClosed ? b.encerraEm.getTime() - a.encerraEm.getTime() : a.encerraEm.getTime() - b.encerraEm.getTime();
  });

  return (
    <div className="mural-block">
      <div className="mural-block-head">
        <h2>Votações</h2>
        <span className="small-note">{votacoes.length} no total</span>
      </div>

      <NovaVotacaoForm />

      {votacoes.length === 0 ? (
        <div className="empty-state">Nenhuma votação criada ainda.</div>
      ) : (
        <div className="poll-list">
          {votacoes.map((p) => {
            const fechada = p.encerraEm <= new Date();
            const totalVotos = p.opcoes.reduce((s, o) => s + o.votos.length, 0);
            const meuVoto = p.opcoes.find((o) => o.votos.some((v) => v.userId === me.id))?.id;
            const canManage = me.isAdmin || p.authorId === me.id;
            const authorName = p.author?.name ?? "Usuário removido";

            return (
              <div key={p.id} className={`poll-card${fechada ? " closed" : ""}`}>
                <div className="poll-head">
                  <h3 className="poll-title">{p.titulo}</h3>
                  <span className={`poll-status ${fechada ? "closed-tag" : "open"}`}>{fechada ? "encerrada" : "aberta"}</span>
                </div>
                <div className="poll-meta">
                  {authorName} · {totalVotos} voto(s) · {fechada ? "encerrou em" : "encerra em"} {fmtDataHora(p.encerraEm)}
                </div>
                <div className="poll-options">
                  {p.opcoes.map((op) => {
                    const pct = totalVotos > 0 ? Math.round((op.votos.length / totalVotos) * 100) : 0;
                    const votou = meuVoto === op.id;
                    const votantes = op.votos.map((v) => v.user?.name ?? "Usuário removido");
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
                                {pct}% ({op.votos.length})
                              </span>
                            </span>
                          </button>
                        </form>
                        <div className="poll-opt-voters">{votantes.length ? `👤 ${votantes.join(", ")}` : "Ninguém votou ainda"}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="poll-footer">
                  <span className="small-note">
                    {fechada ? "" : meuVoto ? "Você já votou — clique noutra opção para trocar." : "Clique numa opção para votar."}
                  </span>
                  <div className="poll-footer-actions">
                    <ExportPollButton
                      poll={{
                        titulo: p.titulo,
                        authorName,
                        fechada,
                        opcoes: p.opcoes.map((o) => ({ texto: o.texto, votantes: o.votos.map((v) => v.user?.name ?? "Usuário removido") })),
                      }}
                    />
                    {canManage && (
                      <ConfirmForm action={deleteVotacao.bind(null, p.id)} confirmMessage="Excluir esta votação?">
                        <button type="submit" className="poll-del">
                          excluir
                        </button>
                      </ConfirmForm>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

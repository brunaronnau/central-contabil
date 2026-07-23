import { prisma } from "@/lib/prisma";
import type { requireUser } from "@/lib/session";
import { deleteRecado, reactToRecado, togglePinRecado } from "@/app/actions/mural-recados";
import { NovoRecadoForm } from "./NovoRecadoForm";
import { ConfirmForm } from "./ConfirmForm";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function tempoRestante(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const min = ms / 60000;
  if (min < 60) return `expira em ${Math.round(min)} min`;
  const horas = min / 60;
  if (horas < 48) return `expira em ${Math.round(horas)}h`;
  return `expira em ${Math.round(horas / 24)} dias`;
}

function fmtDataHora(d: Date): string {
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const REACOES: { tipo: "LIKE" | "HEART" | "DISLIKE"; emoji: string }[] = [
  { tipo: "LIKE", emoji: "👍" },
  { tipo: "HEART", emoji: "❤️" },
  { tipo: "DISLIKE", emoji: "👎" },
];

export async function RecadosBlock({ me }: { me: Awaited<ReturnType<typeof requireUser>> }) {
  const recados = await prisma.recado.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: {
      author: true,
      // Sem "dados" aqui: cada anexo pode ter até 5MB em base64, e essa lista
      // é montada em toda visita à página — o conteúdo só é lido sob demanda,
      // pela rota de download (api/mural/anexo/[id]).
      anexos: { select: { id: true, nome: true, tipo: true, tamanho: true } },
      reacoes: true,
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mural-block">
      <div className="mural-block-head">
        <h2>Recados</h2>
        <span className="small-note">{recados.length} ativo(s)</span>
      </div>

      <NovoRecadoForm />

      {recados.length === 0 ? (
        <div className="empty-state">Nenhum recado no momento. Seja o primeiro a avisar a equipe!</div>
      ) : (
        <div className="recado-list">
          {recados.map((r) => {
            const canManage = me.isAdmin || r.authorId === me.id;
            const counts = { LIKE: 0, HEART: 0, DISLIKE: 0 };
            r.reacoes.forEach((rc) => counts[rc.tipo]++);
            const minhaReacao = r.reacoes.find((rc) => rc.userId === me.id)?.tipo;
            const authorName = r.author?.name ?? "Usuário removido";

            return (
              <div key={r.id} className={`recado-card${r.pinned ? " pinned" : ""}`}>
                <div className="avatar">
                  {r.author?.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.author.photo} alt="" />
                  ) : (
                    initials(authorName)
                  )}
                </div>
                <div className="recado-body">
                  <div className="recado-top">
                    <span className="recado-author">{authorName}</span>
                    <span className="recado-time">{fmtDataHora(r.createdAt)}</span>
                    {r.pinned && <span className="recado-pinned-tag">📌 fixado</span>}
                    <span className="recado-expiry">{tempoRestante(r.expiresAt)}</span>
                  </div>
                  <p className="recado-text">{r.text}</p>
                  {r.anexos.length > 0 && (
                    <div className="recado-attachments">
                      {r.anexos.map((a) => (
                        <a key={a.id} className="recado-attach-chip" href={`/api/mural/anexo/${a.id}`} download={a.nome}>
                          📎 {a.nome} <span style={{ opacity: 0.6 }}>({fmtFileSize(a.tamanho)})</span>
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="recado-footer">
                    <div className="recado-reactions">
                      {REACOES.map(({ tipo, emoji }) => (
                        <form key={tipo} action={reactToRecado.bind(null, r.id, tipo)}>
                          <button type="submit" className={`reaction-btn ${minhaReacao === tipo ? "on" : ""}`}>
                            {emoji} <span className="rc-count">{counts[tipo]}</span>
                          </button>
                        </form>
                      ))}
                    </div>
                    {canManage && (
                      <div className="recado-actions">
                        <form action={togglePinRecado.bind(null, r.id)}>
                          <button type="submit" className={r.pinned ? "pin-on" : ""}>
                            {r.pinned ? "Desfixar" : "Fixar no topo"}
                          </button>
                        </form>
                        <ConfirmForm action={deleteRecado.bind(null, r.id)} confirmMessage="Excluir este recado?">
                          <button type="submit" className="recado-del">
                            excluir
                          </button>
                        </ConfirmForm>
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
  );
}

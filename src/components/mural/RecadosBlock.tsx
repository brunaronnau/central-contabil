import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createRecado, deleteRecado, reactToRecado, togglePinRecado } from "@/app/actions/mural-recados";

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

const REACOES: { tipo: "LIKE" | "HEART" | "DISLIKE"; emoji: string }[] = [
  { tipo: "LIKE", emoji: "👍" },
  { tipo: "HEART", emoji: "❤️" },
  { tipo: "DISLIKE", emoji: "👎" },
];

export async function RecadosBlock() {
  const me = await requireUser();
  const recados = await prisma.recado.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { author: true, anexos: true, reacoes: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mural-block mural-block-highlight">
      <div className="mural-block-head">
        <h2>Recados</h2>
        <span className="small-note">{recados.length} ativo(s)</span>
      </div>

      <details>
        <summary className="btn secondary" style={{ display: "inline-block", marginBottom: 16, cursor: "pointer" }}>
          + Novo recado
        </summary>
        <form action={createRecado} className="mural-form open" encType="multipart/form-data">
          <div className="mural-form-row">
            <label htmlFor="recado-text">Mensagem</label>
            <textarea id="recado-text" name="text" required maxLength={2000} />
          </div>
          <div className="mural-form-grid">
            <div className="mural-form-row">
              <label htmlFor="recado-duration">Expira em</label>
              <select id="recado-duration" name="duration" defaultValue={24}>
                <option value={6}>6 horas</option>
                <option value={24}>24 horas</option>
                <option value={72}>3 dias</option>
                <option value={168}>7 dias</option>
                <option value={360}>15 dias</option>
                <option value={720}>30 dias</option>
              </select>
            </div>
            <div className="mural-form-row">
              <label htmlFor="recado-files">Anexos (opcional, até 5MB cada)</label>
              <input id="recado-files" type="file" name="files" multiple />
            </div>
          </div>
          <div className="mural-form-actions">
            <label className="small-note" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" name="pinned" /> Fixar no topo
            </label>
            <button type="submit" className="btn">
              Publicar
            </button>
          </div>
        </form>
      </details>

      {recados.length === 0 ? (
        <div className="empty-state">Nenhum recado ativo no momento.</div>
      ) : (
        <div className="recado-list">
          {recados.map((r) => {
            const canManage = me.isAdmin || r.authorId === me.id;
            const counts = { LIKE: 0, HEART: 0, DISLIKE: 0 };
            r.reacoes.forEach((rc) => counts[rc.tipo]++);
            const minhaReacao = r.reacoes.find((rc) => rc.userId === me.id)?.tipo;

            return (
              <div key={r.id} className={`recado-card${r.pinned ? " pinned" : ""}`}>
                <div className="avatar">
                  {r.author.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.author.photo} alt="" />
                  ) : (
                    initials(r.author.name)
                  )}
                </div>
                <div className="recado-body">
                  <div className="recado-top">
                    <span className="recado-author">{r.author.name}</span>
                    <span className="recado-time">{r.createdAt.toLocaleDateString("pt-BR")}</span>
                    {r.pinned && <span className="recado-pinned-tag">📌 fixado</span>}
                    <span className="recado-expiry">{tempoRestante(r.expiresAt)}</span>
                  </div>
                  <p className="recado-text">{r.text}</p>
                  {r.anexos.length > 0 && (
                    <div className="recado-attachments">
                      {r.anexos.map((a) => (
                        <a key={a.id} className="recado-attach-chip" href={`data:${a.tipo};base64,${a.dados}`} download={a.nome}>
                          📎 {a.nome}
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
                        <form action={deleteRecado.bind(null, r.id)}>
                          <button type="submit" className="recado-del">
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
  );
}

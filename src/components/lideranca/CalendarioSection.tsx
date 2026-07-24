import { prisma } from "@/lib/prisma";
import { criarEvento, excluirEvento } from "@/app/actions/lideranca";
import { CalendarioGrid, type EventoGrid, type FeriasGrid } from "./CalendarioGrid";
import { ExcluirButton } from "./ExcluirButton";

function fmtData(d: Date) {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

type ItemLista =
  | { tipo: "evento"; id: string; data: Date; titulo: string; descricao: string | null; autor: string }
  | { tipo: "ferias"; id: string; data: Date; dataFim: Date; titulo: string; descricao: string | null };

export async function CalendarioSection() {
  const [eventos, ferias] = await Promise.all([
    prisma.liderancaEvento.findMany({ orderBy: { data: "asc" }, include: { author: { select: { name: true } } } }),
    prisma.liderancaFerias.findMany({ orderBy: { dataInicio: "asc" } }),
  ]);

  const eventosGrid: EventoGrid[] = eventos.map((e) => ({
    id: e.id,
    dia: e.data.getUTCDate(),
    mes: e.data.getUTCMonth(),
    ano: e.data.getUTCFullYear(),
    titulo: e.titulo,
    descricao: e.descricao,
    autor: e.author?.name ?? "Usuário removido",
  }));

  const feriasGrid: FeriasGrid[] = ferias.map((f) => ({
    id: f.id,
    colaborador: f.colaborador,
    inicio: f.dataInicio.toISOString(),
    fim: f.dataFim.toISOString(),
  }));

  const itensLista: ItemLista[] = [
    ...eventos.map(
      (e): ItemLista => ({
        tipo: "evento",
        id: e.id,
        data: e.data,
        titulo: e.titulo,
        descricao: e.descricao,
        autor: e.author?.name ?? "Usuário removido",
      }),
    ),
    ...ferias.map(
      (f): ItemLista => ({
        tipo: "ferias",
        id: f.id,
        data: f.dataInicio,
        dataFim: f.dataFim,
        titulo: f.colaborador,
        descricao: f.observacao,
      }),
    ),
  ].sort((a, b) => a.data.getTime() - b.data.getTime());

  return (
    <section className="lid-view active">
      <div className="card">
        <h2>Nova Observação no Calendário</h2>
        <form action={criarEvento}>
          <div className="field-row">
            <label>Data</label>
            <input className="text-input" type="date" name="data" required />
          </div>
          <div className="field-row">
            <label>Título</label>
            <input className="text-input" name="titulo" required placeholder="Ex.: Fulano — consulta médica" />
          </div>
          <div className="field-row">
            <label>Detalhes (opcional)</label>
            <textarea name="descricao" rows={2} placeholder="Alguma informação a mais, se precisar..." />
          </div>
          <div className="btn-row">
            <button className="btn" type="submit">
              Adicionar ao Calendário
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Lista Cronológica</h2>
        {itensLista.length === 0 ? (
          <div className="empty-state">Nenhuma observação ou férias registrada ainda.</div>
        ) : (
          <div className="lid-evento-list">
            {itensLista.map((item) => (
              <div key={`${item.tipo}-${item.id}`} className={`lid-evento${item.tipo === "ferias" ? " ferias" : ""}`}>
                <div className="lid-evento-data">
                  {fmtData(item.data)}
                  {item.tipo === "ferias" && <> — {fmtData(item.dataFim)}</>}
                </div>
                <div className="lid-evento-body">
                  <div className="lid-evento-titulo">
                    {item.tipo === "ferias" && <span className="lid-tag-ferias">Férias</span>} {item.titulo}
                  </div>
                  {item.descricao && <div className="lid-evento-desc">{item.descricao}</div>}
                  {item.tipo === "evento" && <div className="small-note">registrado por {item.autor}</div>}
                </div>
                {item.tipo === "evento" && (
                  <ExcluirButton action={excluirEvento.bind(null, item.id)} confirmMsg="Excluir esta observação do calendário?" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Calendário do Time</h2>
        <CalendarioGrid eventos={eventosGrid} ferias={feriasGrid} />
      </div>
    </section>
  );
}

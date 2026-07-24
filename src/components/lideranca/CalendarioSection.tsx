import { prisma } from "@/lib/prisma";
import { criarEvento } from "@/app/actions/lideranca";
import { CalendarioGrid, type EventoGrid } from "./CalendarioGrid";

export async function CalendarioSection() {
  const eventos = await prisma.liderancaEvento.findMany({
    orderBy: { data: "asc" },
    include: { author: { select: { name: true } } },
  });

  const eventosGrid: EventoGrid[] = eventos.map((e) => ({
    id: e.id,
    dia: e.data.getUTCDate(),
    mes: e.data.getUTCMonth(),
    ano: e.data.getUTCFullYear(),
    titulo: e.titulo,
    descricao: e.descricao,
    autor: e.author?.name ?? "Usuário removido",
  }));

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
        <h2>Calendário do Time</h2>
        <CalendarioGrid eventos={eventosGrid} />
      </div>
    </section>
  );
}

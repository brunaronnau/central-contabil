import { prisma } from "@/lib/prisma";
import { criarEvento, excluirEvento } from "@/app/actions/lideranca";
import { ExcluirButton } from "./ExcluirButton";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export async function CalendarioSection() {
  const eventos = await prisma.liderancaEvento.findMany({
    orderBy: { data: "asc" },
    include: { author: { select: { name: true } } },
  });

  const now = new Date();
  const mesAtual = now.getUTCMonth();

  const comMes = eventos.map((e) => ({ ...e, mes: e.data.getUTCMonth() }));
  const mesesEmOrdem = Array.from({ length: 12 }, (_, i) => (mesAtual + i) % 12);
  const grupos = mesesEmOrdem
    .map((mes) => ({ mes, itens: comMes.filter((e) => e.mes === mes) }))
    .filter((g) => g.itens.length > 0);

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
        <h2>Observações do Time</h2>
        {grupos.length === 0 ? (
          <div className="empty-state">Nenhuma observação registrada ainda.</div>
        ) : (
          <div className="aniv-months">
            {grupos.map(({ mes, itens }) => (
              <div key={mes} className={`aniv-month-group${mes === mesAtual ? " current" : ""}`}>
                <div className="aniv-month-header">
                  {MESES[mes]}
                  {mes === mesAtual && <span className="aniv-month-tag">mês atual</span>}
                </div>
                <div className="lid-evento-list">
                  {itens.map((e) => (
                    <div key={e.id} className="lid-evento">
                      <div className="lid-evento-data">
                        {String(e.data.getUTCDate()).padStart(2, "0")}/{String(e.data.getUTCMonth() + 1).padStart(2, "0")}
                      </div>
                      <div className="lid-evento-body">
                        <div className="lid-evento-titulo">{e.titulo}</div>
                        {e.descricao && <div className="lid-evento-desc">{e.descricao}</div>}
                        <div className="small-note">registrado por {e.author?.name ?? "Usuário removido"}</div>
                      </div>
                      <ExcluirButton action={excluirEvento.bind(null, e.id)} confirmMsg="Excluir esta observação do calendário?" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

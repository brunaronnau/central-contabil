import { prisma } from "@/lib/prisma";
import { criarFerias, excluirFerias } from "@/app/actions/lideranca";
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

const JANELA_AVISO_DIAS = 7;

function fmtData(d: Date) {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export async function FeriasSection() {
  const ferias = await prisma.liderancaFerias.findMany({
    orderBy: { dataInicio: "asc" },
    include: { author: { select: { name: true } } },
  });

  const hojeUTC = new Date();
  const hojeMD = Date.UTC(hojeUTC.getUTCFullYear(), hojeUTC.getUTCMonth(), hojeUTC.getUTCDate());
  const limiteAviso = hojeMD + JANELA_AVISO_DIAS * 86400000;

  const proximas = ferias.filter((f) => {
    const inicio = f.dataInicio.getTime();
    return inicio >= hojeMD && inicio <= limiteAviso;
  });

  const mesAtual = hojeUTC.getUTCMonth();
  const comMes = ferias.map((f) => ({ ...f, mes: f.dataInicio.getUTCMonth() }));
  const mesesEmOrdem = Array.from({ length: 12 }, (_, i) => (mesAtual + i) % 12);
  const grupos = mesesEmOrdem
    .map((mes) => ({ mes, itens: comMes.filter((f) => f.mes === mes) }))
    .filter((g) => g.itens.length > 0);

  return (
    <section className="lid-view active">
      {proximas.length > 0 && (
        <div className="lid-ferias-alerta">
          <b>Chegando aí:</b>{" "}
          {proximas.map((f) => `${f.colaborador} a partir de ${fmtData(f.dataInicio)}`).join(" · ")}
        </div>
      )}

      <div className="card">
        <h2>Programar Novas Férias</h2>
        <form action={criarFerias}>
          <div className="field-row">
            <label>Colaborador</label>
            <input className="text-input" name="colaborador" required placeholder="Nome do colaborador" />
          </div>
          <div className="field-row">
            <label>Início</label>
            <input className="text-input" type="date" name="dataInicio" required />
          </div>
          <div className="field-row">
            <label>Fim</label>
            <input className="text-input" type="date" name="dataFim" required />
          </div>
          <div className="field-row">
            <label>Observação (opcional)</label>
            <input className="text-input" name="observacao" placeholder="Alguma informação a mais, se precisar..." />
          </div>
          <div className="btn-row">
            <button className="btn" type="submit">
              Programar Férias
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Férias Programadas</h2>
        {grupos.length === 0 ? (
          <div className="empty-state">Nenhuma férias programada ainda.</div>
        ) : (
          <div className="aniv-months">
            {grupos.map(({ mes, itens }) => (
              <div key={mes} className={`aniv-month-group${mes === mesAtual ? " current" : ""}`}>
                <div className="aniv-month-header">
                  {MESES[mes]}
                  {mes === mesAtual && <span className="aniv-month-tag">mês atual</span>}
                </div>
                <div className="lid-evento-list">
                  {itens.map((f) => (
                    <div key={f.id} className="lid-evento">
                      <div className="lid-evento-data">
                        {fmtData(f.dataInicio)} — {fmtData(f.dataFim)}
                      </div>
                      <div className="lid-evento-body">
                        <div className="lid-evento-titulo">{f.colaborador}</div>
                        {f.observacao && <div className="lid-evento-desc">{f.observacao}</div>}
                        <div className="small-note">registrado por {f.author?.name ?? "Usuário removido"}</div>
                      </div>
                      <ExcluirButton action={excluirFerias.bind(null, f.id)} confirmMsg="Excluir este período de férias programado?" />
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

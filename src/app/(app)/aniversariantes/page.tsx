import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AniversariantesPage() {
  await requireUser();

  const users = await prisma.user.findMany({
    where: { birthday: { not: null } },
    select: { id: true, name: true, photo: true, birthday: true },
  });

  const now = new Date();
  const mesAtual = now.getUTCMonth();
  const todayMD = mesAtual * 100 + now.getUTCDate();

  const comData = users
    .map((u) => {
      const b = u.birthday!;
      const md = b.getUTCMonth() * 100 + b.getUTCDate();
      return { u, b, mes: b.getUTCMonth(), dia: b.getUTCDate(), isToday: md === todayMD };
    })
    .sort((a, b) => a.dia - b.dia);

  // Agrupa por mês, começando do mês atual e dando a volta no calendário —
  // assim o grupo mais relevante (mês atual) sempre aparece primeiro.
  const mesesEmOrdem = Array.from({ length: 12 }, (_, i) => (mesAtual + i) % 12);
  const grupos = mesesEmOrdem
    .map((mes) => ({ mes, pessoas: comData.filter((p) => p.mes === mes) }))
    .filter((g) => g.pessoas.length > 0);

  return (
    <section>
      <div className="tool-header">
        <div className="wrap">
          <h1>Aniversariantes</h1>
          <p>Colaboradores que informaram a data de nascimento no cadastro, agrupados por mês.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}>
        {grupos.length === 0 ? (
          <div className="empty-state">Ninguém informou data de aniversário ainda.</div>
        ) : (
          <div className="aniv-months">
            {grupos.map(({ mes, pessoas }) => (
              <div key={mes} className={`aniv-month-group${mes === mesAtual ? " current" : ""}`}>
                <div className="aniv-month-header">
                  {MESES[mes]}
                  {mes === mesAtual && <span className="aniv-month-tag">mês atual</span>}
                </div>
                <div className="aniv-list">
                  {pessoas.map(({ u, b, isToday }) => {
                    const dd = String(b.getUTCDate()).padStart(2, "0");
                    const mm = String(b.getUTCMonth() + 1).padStart(2, "0");
                    return (
                      <div key={u.id} className="aniv-row">
                        <div className="avatar">
                          {u.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.photo} alt="" />
                          ) : (
                            initials(u.name)
                          )}
                        </div>
                        <div>
                          <div className="n">
                            {mes === mesAtual && <span aria-hidden>🎂 </span>}
                            {u.name}
                          </div>
                          <div className="d">
                            {dd}/{mm}
                          </div>
                        </div>
                        {isToday && (
                          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11.5 }}>Hoje!</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

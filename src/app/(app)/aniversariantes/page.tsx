import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const todayMD = now.getUTCMonth() * 100 + now.getUTCDate();

  const withNext = users
    .map((u) => {
      const b = u.birthday!;
      const md = b.getUTCMonth() * 100 + b.getUTCDate();
      let nextYear = new Date(todayUTC).getUTCFullYear();
      if (md < todayMD) nextYear += 1;
      const next = Date.UTC(nextYear, b.getUTCMonth(), b.getUTCDate());
      return { u, b, isToday: md === todayMD, next };
    })
    .sort((a, b) => a.next - b.next);

  return (
    <section>
      <div className="tool-header">
        <div className="wrap">
          <h1>Aniversariantes</h1>
          <p>Colaboradores que informaram a data de nascimento no cadastro, ordenados pelo próximo aniversário.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}>
        {withNext.length === 0 ? (
          <div className="empty-state">Ninguém informou data de aniversário ainda.</div>
        ) : (
          <div className="aniv-list">
            {withNext.map(({ u, b, isToday }) => {
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
                    <div className="n">{u.name}</div>
                    <div className="d">
                      {dd}/{mm}
                    </div>
                  </div>
                  {isToday && (
                    <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 11.5 }}>
                      🎂 Hoje!
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

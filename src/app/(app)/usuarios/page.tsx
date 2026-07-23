import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { deleteUser, toggleAdmin, updateMyName } from "@/app/actions/users";
import { ProfilePhotoEditor } from "@/components/ProfilePhotoEditor";
import { DeleteUserButton } from "@/components/DeleteUserButton";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function UsuariosPage() {
  const me = await requireUser();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const meRecord = users.find((u) => u.id === me.id);

  return (
    <section>
      <div className="tool-header">
        <div className="wrap">
          <h1>Usuários com acesso</h1>
          <p>Lista de todos os cadastros ativos na Central Contábil. Remova o acesso de quem saiu da Navecon.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}>
        <div style={{ maxWidth: 380, marginBottom: 16 }}>
          <ProfilePhotoEditor photo={meRecord?.photo ?? null} />
        </div>

        <form action={updateMyName} className="sugestao-form" style={{ maxWidth: 380, marginBottom: 28 }}>
          <label htmlFor="name" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
            Meu nome de exibição
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={me.name ?? ""}
            required
            style={{
              width: "100%",
              padding: "9px 11px",
              border: "1px solid var(--line)",
              borderRadius: 7,
              fontFamily: "var(--sans)",
              fontSize: 13.5,
            }}
          />
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn secondary">
              Salvar nome
            </button>
          </div>
        </form>

        <table className="users">
          <thead>
            <tr>
              <th></th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Aniversário</th>
              <th>Acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u.id === me.id;
              const canToggleAdmin = me.isAdmin && !isMe;
              const canDelete = me.isAdmin;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="avatar">
                      {u.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.photo} alt="" />
                      ) : (
                        initials(u.name)
                      )}
                    </div>
                  </td>
                  <td>
                    {u.name}
                    {u.isAdmin && <span className="user-tag-admin">admin</span>}
                    {isMe && <span className="user-tag-you">você</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {u.birthday
                      ? u.birthday.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                      : "—"}
                  </td>
                  <td>
                    {u.isAdmin ? (
                      <span className="user-tag-admin">Administrador</span>
                    ) : (
                      <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>Padrão</span>
                    )}
                  </td>
                  <td>
                    <div className="user-actions-cell">
                      {canToggleAdmin && (
                        <form action={toggleAdmin.bind(null, u.id)}>
                          <button type="submit" className={`user-admin-btn ${u.isAdmin ? "is-admin" : ""}`}>
                            {u.isAdmin ? "Remover admin" : "Tornar admin"}
                          </button>
                        </form>
                      )}
                      {canDelete && <DeleteUserButton action={deleteUser.bind(null, u.id)} isMe={isMe} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

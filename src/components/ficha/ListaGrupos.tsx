import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { criarGrupo, excluirGrupo } from "@/app/actions/ficha";
import { ExcluirButton } from "./ExcluirButton";

export async function ListaGrupos({ isAdmin }: { isAdmin: boolean }) {
  const grupos = await prisma.fichaGrupo.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { empresas: true } } },
  });

  return (
    <>
      <div className="card">
        <h2>Criar Novo Grupo</h2>
        <form action={criarGrupo} className="field-row" style={{ gridTemplateColumns: "1fr auto" }}>
          <input className="text-input" name="nome" placeholder="Nome do grupo econômico" required />
          <button className="btn" type="submit">
            Criar Grupo
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Grupos Cadastrados</h2>
        {grupos.length === 0 ? (
          <div className="empty-state">Nenhum grupo cadastrado ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {grupos.map((g) => (
              <div key={g.id} className="file-chip" style={{ padding: "10px 14px" }}>
                <span className="name" style={{ fontFamily: "var(--sans)", maxWidth: "none" }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{g.nome}</span>{" "}
                  <span className="small-note" style={{ fontStyle: "italic" }}>
                    · {g._count.empresas} empresa(s)
                  </span>
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={`/ficha-empresas?tab=setup&grupo=${g.id}`} className="btn secondary" style={{ padding: "5px 10px", fontSize: 12 }}>
                    Selecionar
                  </Link>
                  {isAdmin && (
                    <ExcluirButton
                      action={excluirGrupo.bind(null, g.id)}
                      confirmMsg="Excluir este grupo e todas as empresas/histórico cadastrados nele? Essa ação não pode ser desfeita."
                      label="Excluir Grupo"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

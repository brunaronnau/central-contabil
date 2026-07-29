import { prisma } from "@/lib/prisma";
import { criarGrupo } from "@/app/actions/ficha";
import { GruposFiltrados } from "./GruposFiltrados";

export async function ListaGrupos({ isAdmin }: { isAdmin: boolean }) {
  const grupos = await prisma.fichaGrupo.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { empresas: true } } },
  });

  return (
    <>
      <div className="card">
        <h2>➕ Criar Novo Grupo</h2>
        <form action={criarGrupo} className="field-row" style={{ gridTemplateColumns: "1fr auto" }}>
          <input className="text-input" name="nome" placeholder="Nome do grupo econômico" required />
          <button className="btn" type="submit">
            Criar Grupo
          </button>
        </form>
      </div>

      <div className="card">
        <h2>📋 Grupos Cadastrados</h2>
        <GruposFiltrados grupos={grupos.map((g) => ({ id: g.id, nome: g.nome, empresas: g._count.empresas }))} isAdmin={isAdmin} />
      </div>
    </>
  );
}

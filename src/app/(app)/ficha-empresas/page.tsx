import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ListaGrupos } from "@/components/ficha/ListaGrupos";
import { GrupoSetup } from "@/components/ficha/GrupoSetup";
import { FichaAutoRefresh } from "@/components/ficha/FichaAutoRefresh";

export default async function FichaEmpresasPage({ searchParams }: { searchParams: Promise<{ tab?: string; grupo?: string }> }) {
  const user = await requireUser();
  const { tab, grupo } = await searchParams;
  const abaSetup = tab === "setup";

  return (
    <section>
      <FichaAutoRefresh />
      <div className="tool-header">
        <div className="wrap">
          <h1>Ficha Informativa</h1>
          <p>
            Ficha de cada grupo/empresa pra quando um analista sair e outro assumir a carteira: dados de entrada e
            saída, histórico de tributação, de analista responsável, anexos e observações — nada se perde na troca.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 8, paddingBottom: 40 }} id="tool-ficha">
        <nav className="at-tabs">
          <Link href="/ficha-empresas" className={`at-tab-btn${!abaSetup ? " active" : ""}`}>
            Grupos Cadastrados
          </Link>
          <Link href={grupo ? `/ficha-empresas?tab=setup&grupo=${grupo}` : "/ficha-empresas?tab=setup"} className={`at-tab-btn${abaSetup ? " active" : ""}`}>
            Grupo &amp; Empresas
          </Link>
        </nav>

        {abaSetup ? (
          grupo ? (
            <GrupoSetup grupoId={grupo} isAdmin={user.isAdmin} />
          ) : (
            <div className="card">
              <div className="empty-state">Selecione ou crie um grupo na aba &quot;Grupos Cadastrados&quot; primeiro.</div>
            </div>
          )
        ) : (
          <ListaGrupos isAdmin={user.isAdmin} />
        )}
      </div>
    </section>
  );
}

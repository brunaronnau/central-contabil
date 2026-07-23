import { requireUser } from "@/lib/session";
import { RecadosBlock } from "@/components/mural/RecadosBlock";
import { VotacoesBlock } from "@/components/mural/VotacoesBlock";
import { MetasBlock } from "@/components/mural/MetasBlock";
import { MuralAutoRefresh } from "@/components/mural/MuralAutoRefresh";

export default async function MuralPage() {
  const me = await requireUser();

  return (
    <section>
      <MuralAutoRefresh />
      <div className="tool-header">
        <div className="wrap">
          <h1>Recados & Metas</h1>
          <p>Metas da equipe em destaque, recados com reações/anexos e votações rápidas — tudo na mesma tela.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}>
        <MetasBlock me={me} />
        <div className="mural-two-col">
          <RecadosBlock me={me} />
          <VotacoesBlock me={me} />
        </div>
      </div>
    </section>
  );
}

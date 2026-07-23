import { requireUser } from "@/lib/session";
import { RecadosBlock } from "@/components/mural/RecadosBlock";
import { VotacoesBlock } from "@/components/mural/VotacoesBlock";
import { MetasBlock } from "@/components/mural/MetasBlock";

export default async function MuralPage() {
  const me = await requireUser();

  return (
    <section>
      <div className="tool-header">
        <div className="wrap">
          <h1>Recados & Metas</h1>
          <p>Mural da equipe: recados com reações e anexos, votações rápidas e metas com acompanhamento.</p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 40 }}>
        <RecadosBlock me={me} />
        <div className="mural-two-col">
          <VotacoesBlock me={me} />
          <MetasBlock me={me} />
        </div>
      </div>
    </section>
  );
}

import { requireUser } from "@/lib/session";
import { carregarEntregasSalvas } from "@/app/actions/entregas";
import { EntregasClient } from "@/components/entregas/EntregasClient";

export default async function EntregasPage() {
  const me = await requireUser();
  const salvas = await carregarEntregasSalvas();
  return <EntregasClient userName={me.name ?? "Usuário não identificado"} initialData={salvas} />;
}

import { requireUser } from "@/lib/session";
import { EntregasClient } from "@/components/entregas/EntregasClient";

export default async function EntregasPage() {
  const me = await requireUser();
  return <EntregasClient userName={me.name ?? "Usuário não identificado"} />;
}

import { requireUser } from "@/lib/session";
import { EntregasClient } from "@/components/entregas/EntregasClient";

export default async function EntregasPage() {
  await requireUser();
  return <EntregasClient />;
}

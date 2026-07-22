import { requireUser } from "@/lib/session";
import { AgendaClient } from "@/components/agenda/AgendaClient";

export default async function AgendaPage() {
  await requireUser();
  return <AgendaClient />;
}

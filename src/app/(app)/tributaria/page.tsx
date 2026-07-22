import { requireUser } from "@/lib/session";
import { TributariaClient } from "@/components/tributaria/TributariaClient";

export default async function TributariaPage() {
  await requireUser();
  return <TributariaClient />;
}

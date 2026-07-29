import { requireUser } from "@/lib/session";
import { TributariaClient } from "@/components/tributaria/TributariaClient";

export default async function TributariaPage() {
  const user = await requireUser();
  return <TributariaClient isAdmin={user.isAdmin} />;
}

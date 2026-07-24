// Roda 1x quando o servidor Next.js sobe (ver docs/instrumentation). Usamos
// isso pra registrar um agendamento de verdade (node-cron) — diferente do
// resto do app, que dispara checagens só quando alguém carrega uma página, o
// relatório mensal (todo dia 28) e os lembretes de 7-dias-antes precisam
// acontecer na data certa mesmo que ninguém acesse o site naquele dia.
let registrado = false;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (registrado) return; // evita agendar duas vezes (ex.: hot reload em dev)
  registrado = true;

  const { schedule } = await import("node-cron");
  const { rodarChecagensDiarias } = await import("@/lib/cron-relatorios");

  // Todo dia às 8h, horário de Brasília.
  schedule(
    "0 8 * * *",
    () => {
      rodarChecagensDiarias().catch((err) => console.error("Erro na checagem diária de relatórios por e-mail:", err));
    },
    { timezone: "America/Sao_Paulo" },
  );
}

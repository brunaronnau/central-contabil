import { requireAdmin } from "@/lib/session";
import { LiderancaAutoRefresh } from "@/components/lideranca/LiderancaAutoRefresh";
import { LiderancaTabs } from "@/components/lideranca/LiderancaTabs";
import { NotasSection } from "@/components/lideranca/NotasSection";
import { CalendarioSection } from "@/components/lideranca/CalendarioSection";
import { FeriasSection } from "@/components/lideranca/FeriasSection";

export default async function LiderancaPage() {
  await requireAdmin();

  return (
    <section>
      <LiderancaAutoRefresh />
      <div className="tool-header">
        <div className="wrap">
          <h1>Painel da Liderança</h1>
          <p>
            Espaço restrito aos administradores: observações e metas entre a liderança, calendário de ausências do
            time e controle de férias programadas — nada aqui aparece pros demais colaboradores.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 8, paddingBottom: 40 }}>
        <LiderancaTabs notas={<NotasSection />} calendario={<CalendarioSection />} ferias={<FeriasSection />} />
      </div>
    </section>
  );
}

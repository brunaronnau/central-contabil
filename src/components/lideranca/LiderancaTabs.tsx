"use client";

import { useState, type ReactNode } from "react";

type TabKey = "notas" | "calendario" | "ferias";

const TABS: { key: TabKey; label: string }[] = [
  { key: "notas", label: "Observações & Metas" },
  { key: "calendario", label: "Calendário do Time" },
  { key: "ferias", label: "Controle de Férias" },
];

export function LiderancaTabs({ notas, calendario, ferias }: { notas: ReactNode; calendario: ReactNode; ferias: ReactNode }) {
  const [tab, setTab] = useState<TabKey>("notas");

  return (
    <div id="tool-lideranca">
      <nav className="lid-tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`lid-tab-btn${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "notas" && notas}
      {tab === "calendario" && calendario}
      {tab === "ferias" && ferias}
    </div>
  );
}

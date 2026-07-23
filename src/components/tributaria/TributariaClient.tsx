"use client";

import { useEffect, useState } from "react";
import { type Grupo, carregarGrupos, novoGrupo, salvarGrupos } from "@/lib/tributaria";
import { ViewGrupos } from "./ViewGrupos";
import { ViewSetup } from "./ViewSetup";
import { ViewDados } from "./ViewDados";
import { ViewRelatorio } from "./ViewRelatorio";
import { ViewDashboard } from "./ViewDashboard";

export type ViewKey = "grupos" | "setup" | "dados" | "relatorio" | "dashboard";

const TABS: { key: ViewKey; label: string }[] = [
  { key: "grupos", label: "Grupos Cadastrados" },
  { key: "setup", label: "1. Grupo & Empresas" },
  { key: "dados", label: "2. Dados Mensais" },
  { key: "relatorio", label: "3. Relatório" },
  { key: "dashboard", label: "4. Dashboard" },
];

export function TributariaClient() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoAtivoId, setGrupoAtivoId] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("grupos");
  const [apresentacao, setApresentacao] = useState(false);
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);

  useEffect(() => {
    // localStorage não existe durante o SSR — só dá pra ler depois de montar no cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGrupos(carregarGrupos());
  }, []);

  useEffect(() => {
    document.body.classList.toggle("presentation-mode", apresentacao);
  }, [apresentacao]);

  const grupoAtivo = grupos.find((g) => g.id === grupoAtivoId) ?? null;

  function persist(next: Grupo[]) {
    setGrupos(next);
    salvarGrupos(next);
  }

  function atualizarGrupo(id: string, mutator: (g: Grupo) => Grupo) {
    persist(grupos.map((g) => (g.id === id ? mutator(g) : g)));
  }

  function criarGrupo(nome: string) {
    if (!nome.trim()) return;
    const g = novoGrupo(nome.trim());
    persist([...grupos, g]);
    setGrupoAtivoId(g.id);
    setAno(g.anoSelecionado);
    setView("setup");
  }

  function selecionarGrupo(id: string) {
    setGrupoAtivoId(id);
    const g = grupos.find((x) => x.id === id);
    if (g) setAno(g.anoSelecionado);
    setView("setup");
  }

  function excluirGrupo(id: string) {
    if (!confirm("Excluir este grupo e todas as empresas/dados cadastrados nele? Essa ação não pode ser desfeita.")) return;
    persist(grupos.filter((g) => g.id !== id));
    if (grupoAtivoId === id) {
      setGrupoAtivoId(null);
      setView("grupos");
    }
  }

  function irPara(v: ViewKey) {
    if (v !== "grupos" && !grupoAtivo) {
      alert("Selecione ou crie um grupo antes de continuar.");
      return;
    }
    setView(v);
  }

  function mudarAno(novoAno: number) {
    setAno(novoAno);
    if (grupoAtivo) atualizarGrupo(grupoAtivo.id, (g) => ({ ...g, anoSelecionado: novoAno }));
  }

  function toggleApresentacao() {
    const ligado = !apresentacao;
    setApresentacao(ligado);
    if (ligado) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  return (
    <section id="tool-fiscal">
      <header className="tool-header">
        <div className="wrap">
          <h1>Análise Tributária Comparativa</h1>
          <p>
            Simulação comparativa entre Simples Nacional, Lucro Presumido e Lucro Real para grupos econômicos
            multi-empresa, com relatório e dashboard prontos para apresentar ao cliente.
          </p>
        </div>
      </header>

      <div className="wrap-at">
        <nav className="at-tabs no-print">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`at-tab-btn${view === t.key ? " active" : ""}`} onClick={() => irPara(t.key)}>
              {t.label}
            </button>
          ))}
          <span id="at-headerMeta">
            {grupoAtivo ? `Grupo: ${grupoAtivo.grupoNome} · Ano: ${ano}` : "Nenhum grupo selecionado"}
          </span>
        </nav>

        {view === "grupos" && (
          <ViewGrupos
            grupos={grupos}
            onCriar={criarGrupo}
            onSelecionar={selecionarGrupo}
            onExcluir={excluirGrupo}
            onIrPara={irPara}
            apresentacao={apresentacao}
            onToggleApresentacao={toggleApresentacao}
          />
        )}

        {view === "setup" && grupoAtivo && (
          <ViewSetup
            grupo={grupoAtivo}
            onUpdateGrupo={(mutator) => atualizarGrupo(grupoAtivo.id, mutator)}
            onIrPara={irPara}
            apresentacao={apresentacao}
            onToggleApresentacao={toggleApresentacao}
          />
        )}

        {view === "dados" && grupoAtivo && (
          <ViewDados
            grupo={grupoAtivo}
            ano={ano}
            onAno={mudarAno}
            onUpdateGrupo={(mutator) => atualizarGrupo(grupoAtivo.id, mutator)}
            onIrPara={irPara}
            apresentacao={apresentacao}
            onToggleApresentacao={toggleApresentacao}
          />
        )}

        {view === "relatorio" && grupoAtivo && (
          <ViewRelatorio grupo={grupoAtivo} ano={ano} onAno={mudarAno} apresentacao={apresentacao} onToggleApresentacao={toggleApresentacao} onIrPara={irPara} />
        )}

        {view === "dashboard" && grupoAtivo && (
          <ViewDashboard grupo={grupoAtivo} ano={ano} onAno={mudarAno} apresentacao={apresentacao} onToggleApresentacao={toggleApresentacao} onIrPara={irPara} />
        )}
      </div>
    </section>
  );
}

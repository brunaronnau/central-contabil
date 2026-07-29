"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Grupo, novoGrupo } from "@/lib/tributaria";
import { excluirGrupoTributaria, listarGrupos, salvarGrupoCompleto } from "@/app/actions/tributaria";
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

// Dados são compartilhados entre todos os usuários (banco, não localStorage).
// A cada intervalo, busca de novo do servidor pra enxergar grupos/empresas
// criados ou alterados por outras pessoas quase em tempo real.
const POLL_MS = 15000;
// Edições de texto/números (digitação) esperam um instante de silêncio antes
// de salvar no servidor, pra não disparar uma gravação a cada tecla.
const SAVE_DEBOUNCE_MS = 800;

export function TributariaClient({ isAdmin }: { isAdmin: boolean }) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [grupoAtivoId, setGrupoAtivoId] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>("grupos");
  const [apresentacao, setApresentacao] = useState(false);
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);

  // Só protege o grupo ativo contra o polling enquanto o usuário está
  // efetivamente dentro de uma tela de edição dele — assim que volta pra
  // "Grupos Cadastrados", grupoAtivoId continua setado (pra reabrir o mesmo
  // grupo depois), mas não há mais edição em andamento pra proteger.
  const protegidoIdRef = useRef<string | null>(null);
  useEffect(() => {
    protegidoIdRef.current = view === "grupos" ? null : grupoAtivoId;
  }, [grupoAtivoId, view]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<Grupo | null>(null);
  // Ids excluídos localmente que ainda não foram confirmados como removidos
  // no servidor — evita que um polling com resposta "atrasada" (ainda sem a
  // exclusão) faça o grupo reaparecer por um instante.
  const excluidosPendentesRef = useRef<Set<string>>(new Set());

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const grupo = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (grupo) {
      salvarGrupoCompleto(grupo).catch(() => {
        // Falhou em salvar — a próxima edição (ou o usuário saindo e voltando)
        // tenta de novo naturalmente; não é um erro que trava a UI.
      });
    }
  }, []);

  const scheduleSave = useCallback(
    (grupo: Grupo) => {
      pendingSaveRef.current = grupo;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );

  const carregar = useCallback(async () => {
    const servidor = await listarGrupos();
    const servidorIds = new Set(servidor.map((g) => g.id));
    // O servidor já não tem mais esses ids — a exclusão foi confirmada, não
    // precisa mais "esconder" caso um poll futuro volte a incluí-los por engano.
    for (const id of excluidosPendentesRef.current) {
      if (!servidorIds.has(id)) excluidosPendentesRef.current.delete(id);
    }

    setGrupos((prevLocal) => {
      // Combina local + servidor por id (em vez de simplesmente adotar o
      // array do servidor) — um grupo recém-criado localmente pode ainda não
      // ter chegado no servidor (a gravação é assíncrona/"fire and forget"),
      // e se a gente só usasse o array do servidor, esse grupo sumiria da
      // tela até o próximo poll. Preserva a versão local do grupo em edição
      // (protegido) e do que ainda não foi confirmado no servidor; adota a
      // versão do servidor pra tudo mais, é onde aparecem mudanças de terceiros.
      const ativo = protegidoIdRef.current;
      const servidorPorId = new Map(servidor.map((g) => [g.id, g]));
      const localPorId = new Map(prevLocal.map((g) => [g.id, g]));
      const idsTodos = new Set([...servidorPorId.keys(), ...localPorId.keys()]);

      const resultado: Grupo[] = [];
      for (const id of idsTodos) {
        if (excluidosPendentesRef.current.has(id)) continue;
        if (ativo && id === ativo) {
          const local = localPorId.get(id);
          if (local) resultado.push(local);
          continue;
        }
        const doServidor = servidorPorId.get(id);
        if (doServidor) {
          resultado.push(doServidor);
        } else {
          const local = localPorId.get(id);
          if (local) resultado.push(local);
        }
      }
      return resultado;
    });
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      await carregar();
      if (!cancelado) setCarregando(false);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(carregar, POLL_MS);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    document.body.classList.toggle("presentation-mode", apresentacao);
  }, [apresentacao]);

  useEffect(() => () => flushSave(), [flushSave]);

  const grupoAtivo = grupos.find((g) => g.id === grupoAtivoId) ?? null;

  function atualizarGrupo(id: string, mutator: (g: Grupo) => Grupo) {
    setGrupos((prev) => {
      const next = prev.map((g) => (g.id === id ? mutator(g) : g));
      const atualizado = next.find((g) => g.id === id);
      if (atualizado) scheduleSave(atualizado);
      return next;
    });
  }

  function criarGrupo(nome: string) {
    if (!nome.trim()) return;
    const g = novoGrupo(nome.trim());
    setGrupos((prev) => [...prev, g]);
    salvarGrupoCompleto(g).catch(() => {});
    setGrupoAtivoId(g.id);
    setAno(g.anoSelecionado);
    setView("setup");
  }

  function selecionarGrupo(id: string) {
    flushSave();
    setGrupoAtivoId(id);
    const g = grupos.find((x) => x.id === id);
    if (g) setAno(g.anoSelecionado);
    setView("setup");
  }

  function excluirGrupo(id: string) {
    if (!confirm("Excluir este grupo e todas as empresas/dados cadastrados nele? Essa ação não pode ser desfeita.")) return;
    if (grupoAtivoId === id) {
      pendingSaveRef.current = null;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }
    excluidosPendentesRef.current.add(id);
    setGrupos((prev) => prev.filter((g) => g.id !== id));
    excluirGrupoTributaria(id).catch(() => {
      excluidosPendentesRef.current.delete(id);
    });
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
    if (v === "grupos") flushSave();
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
      <header className="tool-header no-print">
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
            carregando={carregando}
            isAdmin={isAdmin}
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

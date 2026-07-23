"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listNotificacoes,
  marcarNotificacoesVistas,
  savePushSubscription,
  type NotificacaoItem,
} from "@/app/actions/notificacoes";

const POLL_MS = 45000;

const ICONES: Record<string, string> = {
  recado: "🎯",
  votacao: "🎯",
  meta: "🎯",
  alerta: "⚠️",
  aniversario: "🎂",
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function NotifBell() {
  const router = useRouter();
  const [itens, setItens] = useState<NotificacaoItem[]>([]);
  const [temNaoLida, setTemNaoLida] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [pushStatus, setPushStatus] = useState<"indisponivel" | "pendente" | "ativo" | "negado">("pendente");
  const wrapRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const resultado = await listNotificacoes();
    setItens(resultado.itens);
    setTemNaoLida(resultado.temNaoLida);
    setLastSeenAt(resultado.lastSeenAt);
  }, []);

  useEffect(() => {
    // Primeira carga dos dados do servidor — não dá pra evitar o setState aqui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    const id = setInterval(carregar, POLL_MS);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !vapidKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPushStatus("indisponivel");
      return;
    }
    // Lendo Notification.permission (API do navegador) só existe no cliente, após montar.
    if (Notification.permission === "denied") setPushStatus("negado");
    else if (Notification.permission === "granted") setPushStatus("ativo");
    else setPushStatus("pendente");
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function toggle() {
    const abrindo = !aberto;
    setAberto(abrindo);
    if (abrindo) {
      await carregar();
      await marcarNotificacoesVistas();
      setTemNaoLida(false);
    }
  }

  async function ativarPush() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "negado" : "pendente");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
      await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      setPushStatus("ativo");
    } catch {
      setPushStatus("pendente");
    }
  }

  function abrirItem(item: NotificacaoItem) {
    setAberto(false);
    if (item.href) router.push(item.href);
  }

  return (
    <div ref={wrapRef}>
      <button type="button" className="notif-bell" onClick={toggle}>
        <span className="nb-icon">🔔</span>
        <span className="nb-label">Notificações</span>
        {temNaoLida && <span className="nb-badge" />}
      </button>

      {aberto && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span>Notificações</span>
            {pushStatus === "pendente" && (
              <button type="button" onClick={ativarPush}>
                ativar no computador
              </button>
            )}
            {pushStatus === "ativo" && <span className="notif-push-ok">push ativo</span>}
          </div>
          <div className="notif-panel-list">
            {itens.length === 0 ? (
              <div className="notif-panel-empty">Nenhuma novidade por aqui.</div>
            ) : (
              itens.map((item) => (
                <div key={item.id} className="notif-item" onClick={() => abrirItem(item)}>
                  <span className={`ni-dot${item.createdAt <= lastSeenAt ? " read" : ""}`} />
                  <div className="ni-body">
                    <div className="ni-title">
                      {ICONES[item.kind] ?? "🔔"} {item.titulo}
                    </div>
                    {item.sub && <div className="ni-meta">{item.sub}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

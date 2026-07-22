"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AGENDA_CONTROLLERS,
  type AgendaEvent,
  type AgendaNotif,
  agendaEventsInRange,
  agendaFmtDiaSemana,
  agendaFmtHora,
  agendaFmtWeekRange,
  agendaGroupByDay,
  agendaIsToday,
  agendaSimulateChange,
  agendaWeekRange,
  loadAgendaEvents,
  loadAgendaNotifs,
  saveAgendaEvents,
  saveAgendaNotifs,
} from "@/lib/agenda";

type RangeKey = "atual" | "proxima" | "ambas" | "custom";

function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000) + 1;
}

export function AgendaClient() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [notifs, setNotifs] = useState<AgendaNotif[]>([]);
  const [range, setRange] = useState<RangeKey>("atual");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(AGENDA_CONTROLLERS.map((c) => c.id)));
  const [liveText, setLiveText] = useState("Atualizado agora");

  useEffect(() => {
    // localStorage não existe durante o SSR — só dá pra ler depois de montar no cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents(loadAgendaEvents());
    setNotifs(loadAgendaNotifs());
  }, []);

  const agendaPoll = useCallback((manual: boolean) => {
    const deveSimular = manual || Math.random() < 0.25;
    if (deveSimular) {
      setEvents((prevEvents) => {
        const resultado = agendaSimulateChange(prevEvents);
        if (!resultado) return prevEvents;
        saveAgendaEvents(resultado.events);
        setNotifs((prevNotifs) => {
          const proximos = [resultado.notif, ...prevNotifs];
          saveAgendaNotifs(proximos);
          return proximos;
        });
        return resultado.events;
      });
    }
    setLiveText("Atualizado " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  useEffect(() => {
    const id = setInterval(() => agendaPoll(false), 60000);
    return () => clearInterval(id);
  }, [agendaPoll]);

  function trocarRange(r: RangeKey) {
    setRange(r);
    agendaPoll(true);
  }

  function toggleController(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function limparChangelog() {
    if (!confirm("Limpar o histórico de últimas alterações da agenda? Essa ação não pode ser desfeita.")) return;
    setNotifs([]);
    saveAgendaNotifs([]);
  }

  const changedEventIds = useMemo(() => new Set(notifs.map((n) => n.eventId)), [notifs]);

  const cards = useMemo(() => {
    if (range === "atual") {
      const { start, end } = agendaWeekRange(0);
      return [{ label: "Semana atual", start, end, isNext: false }];
    }
    if (range === "proxima") {
      const { start, end } = agendaWeekRange(1);
      return [{ label: "Próxima semana", start, end, isNext: true }];
    }
    if (range === "ambas") {
      const atual = agendaWeekRange(0);
      const proxima = agendaWeekRange(1);
      return [
        { label: "Semana atual", start: atual.start, end: atual.end, isNext: false },
        { label: "Próxima semana", start: proxima.start, end: proxima.end, isNext: true },
      ];
    }
    if (customStart && customEnd) {
      const start = new Date(customStart + "T00:00:00");
      const end = new Date(customEnd + "T00:00:00");
      if (end >= start) return [{ label: "Período selecionado", start, end, isNext: false }];
    }
    return [];
  }, [range, customStart, customEnd]);

  const changelogItems = useMemo(() => {
    const { start } = agendaWeekRange(0);
    const { end } = agendaWeekRange(1);
    return notifs
      .filter((n) => {
        const d = new Date(n.start);
        return d >= start && d <= end;
      })
      .slice(0, 15);
  }, [notifs]);

  return (
    <section id="tool-agenda">
      <div className="tool-header">
        <div className="wrap">
          <h1>Agenda da Controladoria</h1>
          <p>
            Reuniões de todos os Controllers com os clientes, agrupadas por semana. A semana atual e a próxima ficam
            sempre em destaque; use o seletor para consultar outro período.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 32 }}>
        <div className="agenda-status-banner">
          <span>⚠️</span>
          <div>
            <b>Aguardando integração com o Microsoft 365</b>
            Esta tela já está pronta e funcional, exibindo dados de exemplo. Assim que o back-end e o acesso ao
            Microsoft Graph forem confirmados com o TI, é só apontar a integração para os dados passarem a ser os
            reais, com alteração automática entre todos os usuários.
          </div>
        </div>

        <div className="agenda-toolbar">
          <div className="agenda-pills">
            {([
              ["atual", "Semana atual"],
              ["proxima", "Próxima semana"],
              ["ambas", "Atual + próxima"],
              ["custom", "Período específico…"],
            ] as [RangeKey, string][]).map(([key, label]) => (
              <button key={key} type="button" className={`agenda-pill${range === key ? " active" : ""}`} onClick={() => trocarRange(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="agenda-live">
            <span className="dot"></span> <span>{liveText}</span>
          </div>
        </div>

        <div className={`agenda-custom-range${range === "custom" ? " active" : ""}`}>
          <div className="param">
            <label>De</label>
            <input type="date" className="text-input" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </div>
          <div className="param">
            <label>Até</label>
            <input type="date" className="text-input" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
          <button className="btn secondary" type="button" onClick={() => agendaPoll(true)}>
            Aplicar período
          </button>
        </div>

        <div className="agenda-filters">
          {AGENDA_CONTROLLERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`controller-chip${selected.has(c.id) ? " active" : ""}`}
              style={{ color: c.color }}
              onClick={() => toggleController(c.id)}
            >
              <span className="dot" style={{ background: c.color }}></span>
              {c.name}
            </button>
          ))}
        </div>

        <div className="agenda-weeks">
          {cards.map((card) => {
            const eventosCard = agendaEventsInRange(events, card.start, card.end).filter((e) => selected.has(e.controllerId));
            const numDias = Math.min(Math.max(diffDays(card.end, card.start), 1), 14);
            const dias = agendaGroupByDay(eventosCard, card.start, numDias);
            return (
              <div key={card.label} className={`agenda-week-card${card.isNext ? " next-week" : ""}`}>
                <div className="agenda-week-head">
                  <h3>{card.label}</h3>
                  {card.isNext && <span className="focus-tag">Foco</span>}
                  <span className="wk-range">{agendaFmtWeekRange(card.start, card.end)}</span>
                </div>
                {dias.map(({ date, events: evs }) => (
                  <div key={date.toISOString()} className={`agenda-day${agendaIsToday(date) ? " is-today" : ""}`}>
                    <div className="agenda-day-head">
                      {agendaFmtDiaSemana(date)}
                      {agendaIsToday(date) && <span className="today-tag">Hoje</span>}
                    </div>
                    {evs.length === 0 ? (
                      <div className="agenda-empty-day">Sem reuniões</div>
                    ) : (
                      evs.map((ev) => {
                        const controller = AGENDA_CONTROLLERS.find((c) => c.id === ev.controllerId);
                        return (
                          <div key={ev.id} className={`agenda-event${changedEventIds.has(ev.id) ? " is-changed" : ""}`}>
                            <div className="ae-time">{agendaFmtHora(ev.start)}</div>
                            <div className="ae-dot" style={{ background: controller?.color }}></div>
                            <div className="ae-body">
                              <div className="ae-title">
                                {ev.title} — {ev.clientName}
                              </div>
                              <div className="ae-who">{ev.controllerName}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="agenda-changelog">
          <div className="agenda-changelog-head">
            <h4>🕓 Últimas alterações</h4>
            <button className="agenda-changelog-clear" onClick={limparChangelog}>
              Limpar
            </button>
          </div>
          <p className="panel-sub">
            Mudanças detectadas na agenda de qualquer Controller dentro da semana atual ou da próxima — as mesmas que
            geram o aviso no sino, para todos os usuários da Central.
          </p>
          {changelogItems.length === 0 ? (
            <div className="empty-state">Nenhuma alteração registrada na janela atual.</div>
          ) : (
            changelogItems.map((n) => {
              const controller = AGENDA_CONTROLLERS.find((c) => c.name === n.controllerName);
              return (
                <div key={n.id} className="agenda-changelog-item">
                  <span className="ac-dot" style={{ background: controller?.color ?? "var(--ink-soft)" }}></span>
                  <div style={{ flex: 1 }}>
                    <b>{n.controllerName}</b> — {n.title} ({n.clientName}) alterado para {agendaFmtHora(n.start)}
                  </div>
                  <span className="ac-when">{agendaFmtHora(n.detectedAt)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

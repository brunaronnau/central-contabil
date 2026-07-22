export type Controller = { id: string; name: string; color: string };

export type AgendaEvent = {
  id: string;
  controllerId: string;
  controllerName: string;
  title: string;
  clientName: string;
  start: string; // ISO
  end: string; // ISO
  location: string;
  status: string;
};

export type AgendaNotif = {
  id: string;
  eventId: string;
  controllerName: string;
  tipo: "novo" | "alterado" | "cancelado";
  title: string;
  clientName: string;
  start: string;
  detectedAt: string;
  read: boolean;
};

export const AGENDA_CONTROLLERS: Controller[] = [
  { id: "ctr1", name: "André Gonçalves", color: "#2B4C6F" },
  { id: "ctr2", name: "Pablo Nascimento", color: "#8A6D3B" },
  { id: "ctr3", name: "Lucas Boeno", color: "#1F7A5C" },
  { id: "ctr4", name: "Helen Serafim", color: "#A8681B" },
  { id: "ctr5", name: "Igor Miranda", color: "#AE3A32" },
  { id: "ctr6", name: "Marcelo Oliveira", color: "#5B4B8A" },
  { id: "ctr7", name: "Christopher Farias", color: "#3C7A89" },
];

const AGENDA_TITLES = [
  "Reunião de fechamento mensal",
  "Alinhamento de indicadores",
  "Revisão de obrigações fiscais",
  "Planejamento tributário",
  "Apresentação de resultados",
  "Revisão de folha de pagamento",
  "Conciliação bancária",
  "Discussão de fluxo de caixa",
  "Reunião de abertura de ciclo",
];

const AGENDA_EMPRESA_TIPOS = [
  "Comércio",
  "Indústria",
  "Serviços",
  "Transportes",
  "Construtora",
  "Distribuidora",
  "Farmácia",
  "Restaurante",
  "Consultoria",
  "Tecnologia",
];
const AGENDA_EMPRESA_NOMES = [
  "Bracuhy",
  "Andrade",
  "Silveira",
  "Monte Verde",
  "Costa Azul",
  "Bela Vista",
  "Santa Rita",
  "São Miguel",
  "Portal",
  "Horizonte",
  "Central",
  "Atlântico",
  "Rio Claro",
  "Vale Verde",
  "Boa Esperança",
  "Nova Era",
  "Aurora",
];
const AGENDA_EMPRESA_SUFIXOS = ["Ltda", "ME", "EIRELI", "S.A.", "& Cia"];

function agendaRandomClientName(): string {
  const tipo = AGENDA_EMPRESA_TIPOS[Math.floor(Math.random() * AGENDA_EMPRESA_TIPOS.length)];
  const nome = AGENDA_EMPRESA_NOMES[Math.floor(Math.random() * AGENDA_EMPRESA_NOMES.length)];
  const sufixo = AGENDA_EMPRESA_SUFIXOS[Math.floor(Math.random() * AGENDA_EMPRESA_SUFIXOS.length)];
  return `${tipo} ${nome} ${sufixo}`;
}

/* ==================== Semanas (comercial, seg-sex) ==================== */

function agendaStartOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function agendaAddDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function agendaWeekRange(offset: number): { start: Date; end: Date } {
  const monday = agendaAddDays(agendaStartOfWeek(new Date()), offset * 7);
  const friday = agendaAddDays(monday, 4);
  return { start: monday, end: friday };
}

export function agendaEventsInRange(events: AgendaEvent[], start: Date, end: Date): AgendaEvent[] {
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  return events.filter((e) => {
    const d = new Date(e.start);
    return d >= start && d <= endOfDay;
  });
}

export function agendaGroupByDay(events: AgendaEvent[], start: Date, numDias = 5): { date: Date; events: AgendaEvent[] }[] {
  const dias: { date: Date; events: AgendaEvent[] }[] = [];
  for (let i = 0; i < numDias; i++) {
    const date = agendaAddDays(start, i);
    const dayEvents = events
      .filter((e) => {
        const d = new Date(e.start);
        return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
      })
      .sort((a, b) => a.start.localeCompare(b.start));
    dias.push({ date, events: dayEvents });
  }
  return dias;
}

/* ==================== Dados de exemplo (mock) ==================== */

export function agendaSeedEvents(): AgendaEvent[] {
  const events: AgendaEvent[] = [];
  let n = 0;
  for (let w = -2; w <= 3; w++) {
    const monday = agendaAddDays(agendaStartOfWeek(new Date()), w * 7);
    AGENDA_CONTROLLERS.forEach((ctr) => {
      const qtd = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < qtd; i++) {
        const dayOffset = Math.floor(Math.random() * 5);
        const hour = 9 + Math.floor(Math.random() * 7);
        const day = agendaAddDays(monday, dayOffset);
        day.setHours(hour, 0, 0, 0);
        const end = new Date(day.getTime() + 3600000);
        events.push({
          id: "ev" + ++n,
          controllerId: ctr.id,
          controllerName: ctr.name,
          title: AGENDA_TITLES[Math.floor(Math.random() * AGENDA_TITLES.length)],
          clientName: agendaRandomClientName(),
          start: day.toISOString(),
          end: end.toISOString(),
          location: "Microsoft Teams",
          status: "confirmado",
        });
      }
    });
  }
  return events;
}

/* ==================== Persistência (localStorage) — protótipo, sem back-end ==================== */

const LS_EVENTS = "nvc_agenda_events_v2";
const LS_NOTIFS = "nvc_agenda_notifs_v2";

export function loadAgendaEvents(): AgendaEvent[] {
  try {
    const raw = localStorage.getItem(LS_EVENTS);
    if (raw) {
      const events = JSON.parse(raw) as AgendaEvent[];
      const validIds = new Set(AGENDA_CONTROLLERS.map((c) => c.id));
      if (Array.isArray(events) && events.length > 0 && events.every((e) => validIds.has(e.controllerId))) return events;
    }
  } catch {
    // ignora e regenera
  }
  const seeded = agendaSeedEvents();
  saveAgendaEvents(seeded);
  return seeded;
}

export function saveAgendaEvents(events: AgendaEvent[]) {
  try {
    localStorage.setItem(LS_EVENTS, JSON.stringify(events));
  } catch {
    // localStorage indisponível — não é crítico
  }
}

export function loadAgendaNotifs(): AgendaNotif[] {
  try {
    const raw = localStorage.getItem(LS_NOTIFS);
    return raw ? (JSON.parse(raw) as AgendaNotif[]) : [];
  } catch {
    return [];
  }
}

export function saveAgendaNotifs(notifs: AgendaNotif[]) {
  try {
    localStorage.setItem(LS_NOTIFS, JSON.stringify(notifs));
  } catch {
    // localStorage indisponível — não é crítico
  }
}

/* ==================== Simulação de alteração (protótipo — sem Microsoft Graph) ==================== */

export function agendaSimulateChange(events: AgendaEvent[]): { events: AgendaEvent[]; notif: AgendaNotif } | null {
  const { start: curStart } = agendaWeekRange(0);
  const { end: nextEnd } = agendaWeekRange(1);
  const candidatos = events.filter((e) => {
    const d = new Date(e.start);
    return d >= curStart && d <= nextEnd;
  });
  if (candidatos.length === 0) return null;

  const ev = candidatos[Math.floor(Math.random() * candidatos.length)];
  const deltaHoras = [1, 2, 3][Math.floor(Math.random() * 3)] * (Math.random() < 0.5 ? -1 : 1);
  const novoInicio = new Date(new Date(ev.start).getTime() + deltaHoras * 3600000);
  const novoFim = new Date(novoInicio.getTime() + 3600000);

  const eventosAtualizados = events.map((e) => (e.id === ev.id ? { ...e, start: novoInicio.toISOString(), end: novoFim.toISOString() } : e));

  const notif: AgendaNotif = {
    id: "notif" + Date.now() + Math.random().toString(36).slice(2, 6),
    eventId: ev.id,
    controllerName: ev.controllerName,
    tipo: "alterado",
    title: ev.title,
    clientName: ev.clientName,
    start: novoInicio.toISOString(),
    detectedAt: new Date().toISOString(),
    read: false,
  };

  return { events: eventosAtualizados, notif };
}

/* ==================== Formatação ==================== */

export function agendaFmtWeekRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function agendaFmtDiaSemana(d: Date): string {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export function agendaFmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function agendaIsToday(d: Date): boolean {
  const hoje = new Date();
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
}

import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth-signout";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const TOOL_NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "⌂", label: "Central" },
  { href: "/conciliacao", icon: "⇄", label: "Conciliação Bancária" },
];

const UTILITY_NAV_ITEMS: NavItem[] = [
  { href: "/aniversariantes", icon: "🎂", label: "Aniversariantes" },
  { href: "/usuarios", icon: "👥", label: "Usuários" },
  { href: "/sugestoes", icon: "💡", label: "Sugestões" },
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; photo?: string | null };
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <Image src="/navecon-logo.png" alt="Navecon" width={191} height={36} className="logo" priority />
          <p className="sidebar-title">Central Contábil</p>
        </div>

        <button
          type="button"
          className="notif-bell"
          title="Notificações: em breve, quando a Agenda da Controladoria e o Mural forem migrados"
        >
          <span className="nb-icon">🔔</span>
          <span className="nb-label">Notificações</span>
        </button>

        <nav className="tool-nav">
          {TOOL_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="tool-nav-item">
              <span className="tn-icon">{item.icon}</span> {item.label}
            </Link>
          ))}
          <div className="tool-nav-placeholder">+ Novas ferramentas em breve</div>
          {UTILITY_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="tool-nav-item">
              <span className="tn-icon">{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">
            {user.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo} alt="" />
            ) : (
              initials(user.name)
            )}
          </div>
          <div className="who">
            <div className="n">{user.name}</div>
            <div className="e">{user.email}</div>
          </div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="sidebar-logout-btn">
            ⏻ Sair da conta
          </button>
        </form>

        <div className="sidebar-footer">
          Navecon
          <br />
          Contabilidade e Assessoria
        </div>
      </aside>

      <main className="main-area">{children}</main>
    </div>
  );
}

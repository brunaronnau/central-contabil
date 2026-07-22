import Link from "next/link";
import { signOutAction } from "@/app/actions/auth-signout";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "⌂", label: "Central" },
  { href: "/conciliacao", icon: "⇄", label: "Conciliação Bancária" },
  { href: "/sugestoes", icon: "💡", label: "Sugestões" },
  { href: "/aniversariantes", icon: "🎂", label: "Aniversariantes" },
  { href: "/usuarios", icon: "👥", label: "Usuários" },
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
          <p className="sidebar-title">Central Contábil</p>
        </div>

        <nav className="tool-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="tool-nav-item">
              <span className="tn-icon">{item.icon}</span> {item.label}
            </Link>
          ))}
          <div className="tool-nav-placeholder">+ Novas ferramentas em breve</div>
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

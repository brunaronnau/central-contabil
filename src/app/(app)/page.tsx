import Link from "next/link";

const TOOLS = [
  {
    href: "/conciliacao",
    icon: "⇄",
    title: "Conciliação Bancária",
    description: "Confronte extrato bancário e relatório de contas por valor, data e descrição, com apoio de IA.",
  },
  {
    href: "/estoque",
    icon: "📊",
    title: "Calculadora de Estoque",
    description: "Estima o estoque final quando o cliente não envia controle de estoque, a partir de EI, compras e faturamento.",
  },
  {
    href: "/entregas",
    icon: "📈",
    title: "Gestão de Entregas",
    description: "Acompanhamento de entregas conforme relatório extraído do Acessórias.",
  },
  {
    href: "/tributaria",
    icon: "💵",
    title: "Análise Tributária",
    description: "Compara cenários de Simples, Presumido e Real para planejamento tributário multi-empresa.",
  },
];

export default function HomePage() {
  return (
    <section className="home-view">
      <h1>Central Contábil</h1>
      <p className="home-sub">
        Ferramentas internas da Navecon para automatizar rotinas do escritório. Escolha uma ferramenta para
        começar.
      </p>
      <div className="tool-grid">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="tool-card">
            <span className="tc-icon">{tool.icon}</span>
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
          </Link>
        ))}
        <div className="tool-card tool-card-placeholder">
          <span className="tc-icon">+</span>
          <h3>Próxima ferramenta</h3>
          <p>Peça para eu adicionar uma nova ferramenta aqui.</p>
        </div>
      </div>
    </section>
  );
}

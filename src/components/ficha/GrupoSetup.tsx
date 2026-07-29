import { prisma } from "@/lib/prisma";
import { criarEmpresa, salvarGrupo } from "@/app/actions/ficha";
import { EmpresaCard, type EmpresaData } from "./EmpresaCard";

function toDateInput(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export async function GrupoSetup({ grupoId, isAdmin }: { grupoId: string; isAdmin: boolean }) {
  const grupo = await prisma.fichaGrupo.findUnique({
    where: { id: grupoId },
    include: {
      empresas: {
        orderBy: { createdAt: "asc" },
        include: {
          tributacoes: { orderBy: { dataInicio: "asc" } },
          analistas: { orderBy: { dataInicio: "asc" } },
          anexos: { orderBy: { createdAt: "asc" }, select: { id: true, nome: true, tipo: true, tamanho: true, observacao: true, createdAt: true } },
          observacoes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
        },
      },
    },
  });

  if (!grupo) {
    return (
      <div className="card">
        <div className="empty-state">Este grupo não existe mais (pode ter sido excluído). Volte para &quot;Grupos Cadastrados&quot;.</div>
      </div>
    );
  }

  const empresas: EmpresaData[] = grupo.empresas.map((e) => ({
    id: e.id,
    nome: e.nome,
    cnpj: e.cnpj,
    localDocumentos: e.localDocumentos,
    localDocumentosOutro: e.localDocumentosOutro,
    contatoNome: e.contatoNome,
    contatoTelefone: e.contatoTelefone,
    semMovimentacao: e.semMovimentacao,
    semMovimentacaoConfirmadoEm: toDateInput(e.semMovimentacaoConfirmadoEm),
    tributacoes: e.tributacoes.map((t) => ({ id: t.id, regime: t.regime, dataInicio: toDateInput(t.dataInicio), dataFim: toDateInput(t.dataFim) })),
    analistas: e.analistas.map((a) => ({
      id: a.id,
      nomeAnalista: a.nomeAnalista,
      dataInicio: toDateInput(a.dataInicio),
      dataFim: toDateInput(a.dataFim),
    })),
    anexos: e.anexos.map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tamanho: a.tamanho,
      observacao: a.observacao,
      createdAt: a.createdAt.toISOString(),
    })),
    observacoes: e.observacoes.map((o) => ({
      id: o.id,
      texto: o.texto,
      createdAt: o.createdAt.toISOString(),
      autor: o.author?.name ?? "Usuário removido",
    })),
  }));

  return (
    <>
      <div className="card">
        <h2>Dados do Grupo</h2>
        <form action={salvarGrupo.bind(null, grupo.id)}>
          <div className="field-row">
            <label>Nome do grupo</label>
            <input className="text-input" name="nome" defaultValue={grupo.nome} required />
          </div>
          <div className="field-row">
            <label>Data de entrada</label>
            <input className="text-input" type="date" name="dataEntrada" defaultValue={toDateInput(grupo.dataEntrada)} />
          </div>
          <details open={!!(grupo.contabilidadeAnteriorNome || grupo.contabilidadeAnteriorCelular || grupo.contabilidadeAnteriorEmail)}>
            <summary className="ficha-toggle-discreto">Contabilidade anterior</summary>
            <div className="field-row">
              <label>Nome da contabilidade</label>
              <input className="text-input" name="contabilidadeAnteriorNome" defaultValue={grupo.contabilidadeAnteriorNome ?? ""} />
            </div>
            <div className="field-row">
              <label>Celular para contato</label>
              <input className="text-input" name="contabilidadeAnteriorCelular" defaultValue={grupo.contabilidadeAnteriorCelular ?? ""} />
            </div>
            <div className="field-row">
              <label>E-mail para contato</label>
              <input className="text-input" type="email" name="contabilidadeAnteriorEmail" defaultValue={grupo.contabilidadeAnteriorEmail ?? ""} />
            </div>
          </details>

          <div className="field-row" style={{ marginTop: 14 }}>
            <label>Data de saída</label>
            <input className="text-input" type="date" name="dataSaida" defaultValue={toDateInput(grupo.dataSaida)} />
          </div>
          <details open={!!(grupo.contabilidadeNovaNome || grupo.contabilidadeNovaCelular || grupo.contabilidadeNovaEmail)}>
            <summary className="ficha-toggle-discreto">Nova contabilidade</summary>
            <div className="field-row">
              <label>Nome da contabilidade</label>
              <input className="text-input" name="contabilidadeNovaNome" defaultValue={grupo.contabilidadeNovaNome ?? ""} />
            </div>
            <div className="field-row">
              <label>Celular para contato</label>
              <input className="text-input" name="contabilidadeNovaCelular" defaultValue={grupo.contabilidadeNovaCelular ?? ""} />
            </div>
            <div className="field-row">
              <label>E-mail para contato</label>
              <input className="text-input" type="email" name="contabilidadeNovaEmail" defaultValue={grupo.contabilidadeNovaEmail ?? ""} />
            </div>
          </details>

          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn" type="submit">
              Salvar Dados do Grupo
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Empresas do Grupo</h2>
        {empresas.length === 0 && <div className="empty-state">Nenhuma empresa cadastrada ainda.</div>}
        {empresas.map((emp) => (
          <EmpresaCard key={emp.id} empresa={emp} isAdmin={isAdmin} />
        ))}

        <form action={criarEmpresa.bind(null, grupo.id)} className="btn-row" style={{ marginTop: 8 }}>
          <input className="text-input" name="nome" placeholder="Nome da nova empresa" required style={{ maxWidth: 280 }} />
          <input className="text-input" name="cnpj" placeholder="CNPJ" style={{ maxWidth: 200 }} />
          <button className="btn secondary" type="submit">
            + Adicionar Empresa
          </button>
        </form>
      </div>
    </>
  );
}

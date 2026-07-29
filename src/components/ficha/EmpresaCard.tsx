"use client";

import { useState } from "react";
import type { FichaLocalDocumentos } from "@/generated/prisma/enums";
import {
  adicionarAnalista,
  adicionarAnexo,
  adicionarObservacao,
  adicionarTributacao,
  excluirEmpresa,
  salvarEmpresaCampos,
} from "@/app/actions/ficha";
import { ExcluirButton } from "./ExcluirButton";

export type EmpresaData = {
  id: string;
  nome: string;
  cnpj: string;
  localDocumentos: FichaLocalDocumentos;
  localDocumentosOutro: string | null;
  contatoNome: string | null;
  contatoTelefone: string | null;
  semMovimentacao: boolean;
  semMovimentacaoConfirmadoEm: string;
  tributacoes: { id: string; regime: string; dataInicio: string; dataFim: string }[];
  analistas: { id: string; nomeAnalista: string; dataInicio: string; dataFim: string }[];
  anexos: { id: string; nome: string; tipo: string; tamanho: number; observacao: string | null; createdAt: string }[];
  observacoes: { id: string; texto: string; createdAt: string; autor: string }[];
};

const LOCAL_DOCS_LABEL: Record<FichaLocalDocumentos, string> = {
  AC_DOCS: "AC Docs",
  NEXTCLOUD: "Nextcloud",
  CAPSULA: "Cápsula",
  OUTRO: "Outro",
};

function fmtData(iso: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function fmtTamanho(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function EmpresaCard({ empresa: emp, isAdmin }: { empresa: EmpresaData; isAdmin: boolean }) {
  const [aberta, setAberta] = useState(false);
  const [localDocumentos, setLocalDocumentos] = useState<FichaLocalDocumentos>(emp.localDocumentos);
  const [localDocumentosOutro, setLocalDocumentosOutro] = useState(emp.localDocumentosOutro ?? "");
  const [semMovimentacao, setSemMovimentacao] = useState(emp.semMovimentacao);

  const tagLocal = localDocumentos === "OUTRO" && localDocumentosOutro ? localDocumentosOutro : LOCAL_DOCS_LABEL[localDocumentos];

  return (
    <div className={`company${aberta ? " open" : ""}`}>
      <div className="head" onClick={() => setAberta((v) => !v)}>
        <span>
          {emp.nome || "(empresa sem nome)"} <span className="ficha-tag">{tagLocal}</span>
        </span>
        <span className="small-note">{aberta ? "▲" : "▼"}</span>
      </div>
      <div className="body">
        <form action={salvarEmpresaCampos.bind(null, emp.id)}>
          <div className="field-row">
            <label>Nome</label>
            <input className="text-input" name="nome" defaultValue={emp.nome} required />
          </div>
          <div className="field-row">
            <label>CNPJ</label>
            <input className="text-input" name="cnpj" defaultValue={emp.cnpj} />
          </div>
          <div className="field-row">
            <label>Contato na empresa</label>
            <input className="text-input" name="contatoNome" defaultValue={emp.contatoNome ?? ""} placeholder="Nome de quem chamar quando necessário" />
          </div>
          <div className="field-row">
            <label>Telefone do contato</label>
            <input className="text-input" name="contatoTelefone" defaultValue={emp.contatoTelefone ?? ""} />
          </div>
          <div className="field-row">
            <label>Onde manda os documentos mensais</label>
            <select name="localDocumentos" value={localDocumentos} onChange={(e) => setLocalDocumentos(e.target.value as FichaLocalDocumentos)}>
              {(Object.keys(LOCAL_DOCS_LABEL) as FichaLocalDocumentos[]).map((k) => (
                <option key={k} value={k}>
                  {LOCAL_DOCS_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          {localDocumentos === "OUTRO" && (
            <div className="field-row">
              <label>Qual local</label>
              <input
                className="text-input"
                name="localDocumentosOutro"
                value={localDocumentosOutro}
                onChange={(e) => setLocalDocumentosOutro(e.target.value)}
              />
            </div>
          )}
          <div className="field-row">
            <label>Empresa sem movimentação</label>
            <input type="checkbox" name="semMovimentacao" checked={semMovimentacao} onChange={(e) => setSemMovimentacao(e.target.checked)} />
          </div>
          {semMovimentacao && (
            <div className="field-row">
              <label>Confirmado sem movimentação em</label>
              <input className="text-input" type="date" name="semMovimentacaoConfirmadoEm" defaultValue={emp.semMovimentacaoConfirmadoEm} />
            </div>
          )}
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" type="submit">
              Salvar Dados da Empresa
            </button>
            {isAdmin && (
              <ExcluirButton
                action={excluirEmpresa.bind(null, emp.id)}
                confirmMsg="Excluir esta empresa e todo o histórico dela (tributação, analistas, anexos, observações)? Essa ação não pode ser desfeita."
                label="Excluir Empresa"
              />
            )}
          </div>
        </form>

        <div className="ficha-sub">
          <h3>Histórico de Tributação</h3>
          {emp.tributacoes.length === 0 ? (
            <div className="empty-state">Nenhuma tributação registrada ainda.</div>
          ) : (
            <ul className="ficha-historico-list">
              {emp.tributacoes.map((t) => (
                <li key={t.id}>
                  <strong>{t.regime}</strong> — {fmtData(t.dataInicio)} até {t.dataFim ? fmtData(t.dataFim) : "atual"}
                </li>
              ))}
            </ul>
          )}
          <form action={adicionarTributacao.bind(null, emp.id)} className="field-row" style={{ gridTemplateColumns: "1fr 150px 150px auto", marginTop: 8 }}>
            <select name="regime" defaultValue="" required>
              <option value="" disabled>
                Regime...
              </option>
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
              <option value="Lucro Real">Lucro Real</option>
            </select>
            <input className="text-input" type="date" name="dataInicio" title="Data início" required />
            <input className="text-input" type="date" name="dataFim" title="Data fim (deixe em branco se ainda for o regime atual)" />
            <button className="btn secondary" type="submit">
              Registrar
            </button>
          </form>
          <p className="small-note" style={{ marginTop: 4 }}>
            Início e fim (fim em branco = regime atual da empresa).
          </p>
        </div>

        <div className="ficha-sub">
          <h3>Analista Responsável</h3>
          {emp.analistas.length === 0 ? (
            <div className="empty-state">Nenhum analista registrado ainda.</div>
          ) : (
            <ul className="ficha-historico-list">
              {emp.analistas.map((a) => (
                <li key={a.id}>
                  <strong>{a.nomeAnalista}</strong> — {fmtData(a.dataInicio)} até {a.dataFim ? fmtData(a.dataFim) : "atual"}
                </li>
              ))}
            </ul>
          )}
          <form action={adicionarAnalista.bind(null, emp.id)} className="field-row" style={{ gridTemplateColumns: "1fr 150px 150px auto", marginTop: 8 }}>
            <input className="text-input" name="nomeAnalista" placeholder="Nome do analista" required />
            <input className="text-input" type="date" name="dataInicio" title="Data início" required />
            <input className="text-input" type="date" name="dataFim" title="Data fim (deixe em branco se ainda for o analista atual)" />
            <button className="btn secondary" type="submit">
              Registrar
            </button>
          </form>
          <p className="small-note" style={{ marginTop: 4 }}>
            Início e fim (fim em branco = analista atual da empresa).
          </p>
        </div>

        <div className="ficha-sub">
          <h3>Anexos (prints)</h3>
          {emp.anexos.length === 0 ? (
            <div className="empty-state">Nenhum anexo ainda.</div>
          ) : (
            <ul className="ficha-historico-list ficha-anexos-list">
              {emp.anexos.map((a) => {
                const imagem = a.tipo.startsWith("image/");
                return (
                  <li key={a.id} className={imagem ? "ficha-anexo-imagem" : ""}>
                    {imagem ? (
                      <a href={`/api/ficha/anexo/${a.id}`} target="_blank" rel="noopener noreferrer" title={a.nome}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/ficha/anexo/${a.id}`} alt={a.nome} className="ficha-anexo-thumb" />
                      </a>
                    ) : (
                      <a href={`/api/ficha/anexo/${a.id}`} download={a.nome}>
                        📎 {a.nome}
                      </a>
                    )}
                    <span className="small-note">
                      ({fmtTamanho(a.tamanho)} · {new Date(a.createdAt).toLocaleDateString("pt-BR")})
                    </span>
                    {a.observacao && <div className="small-note">{a.observacao}</div>}
                  </li>
                );
              })}
            </ul>
          )}
          <form action={adicionarAnexo} encType="multipart/form-data" style={{ marginTop: 8 }}>
            <input type="hidden" name="empresaId" value={emp.id} />
            <div className="field-row">
              <label>Arquivo</label>
              <input type="file" name="arquivo" required />
            </div>
            <div className="field-row">
              <label>Observação</label>
              <input className="text-input" name="observacao" placeholder="O que esse print mostra" />
            </div>
            <div className="btn-row">
              <button className="btn secondary" type="submit">
                Anexar
              </button>
            </div>
          </form>
        </div>

        <div className="ficha-sub">
          <h3>Observações</h3>
          {emp.observacoes.length === 0 ? (
            <div className="empty-state">Nenhuma observação ainda.</div>
          ) : (
            <ul className="ficha-historico-list">
              {emp.observacoes.map((o) => (
                <li key={o.id}>
                  <p style={{ margin: "0 0 4px" }}>{o.texto}</p>
                  <span className="small-note">
                    {o.autor} · {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={adicionarObservacao.bind(null, emp.id)} style={{ marginTop: 8 }}>
            <div className="field-row">
              <label>Nova observação</label>
              <textarea name="texto" rows={2} required placeholder="Peculiaridades, combinados, pendências..." />
            </div>
            <div className="btn-row">
              <button className="btn secondary" type="submit">
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

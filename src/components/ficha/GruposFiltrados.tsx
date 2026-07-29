"use client";

import { useState } from "react";
import Link from "next/link";
import { excluirGrupo } from "@/app/actions/ficha";
import { ExcluirButton } from "./ExcluirButton";

type GrupoResumo = { id: string; nome: string; empresas: number };

export function GruposFiltrados({ grupos, isAdmin }: { grupos: GrupoResumo[]; isAdmin: boolean }) {
  const [busca, setBusca] = useState("");

  if (grupos.length === 0) {
    return <div className="empty-state">Nenhum grupo cadastrado ainda.</div>;
  }

  const filtrados = grupos.filter((g) => g.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <>
      <input
        className="text-input"
        placeholder="Pesquisar grupo pelo nome..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      {filtrados.length === 0 ? (
        <div className="empty-state">Nenhum grupo encontrado para &quot;{busca}&quot;.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrados.map((g) => (
            <div key={g.id} className="file-chip" style={{ padding: "10px 14px" }}>
              <span className="name" style={{ fontFamily: "var(--sans)", maxWidth: "none" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{g.nome}</span>{" "}
                <span className="small-note" style={{ fontStyle: "italic" }}>
                  · {g.empresas} empresa(s)
                </span>
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/ficha-empresas?tab=setup&grupo=${g.id}`} className="btn secondary" style={{ padding: "5px 10px", fontSize: 12 }}>
                  Selecionar
                </Link>
                {isAdmin && (
                  <ExcluirButton
                    action={excluirGrupo.bind(null, g.id)}
                    confirmMsg="Excluir este grupo e todas as empresas/histórico cadastrados nele? Essa ação não pode ser desfeita."
                    label="Excluir Grupo"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

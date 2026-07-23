"use client";

import { useRef, useState, useTransition } from "react";
import { createVotacao } from "@/app/actions/mural-votacoes";

const MAX_OPCOES = 8;
const MIN_OPCOES = 2;

export function NovaVotacaoForm() {
  const [opcoes, setOpcoes] = useState<string[]>(["", ""]);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLSelectElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function addOpcao() {
    if (opcoes.length >= MAX_OPCOES) {
      alert(`Máximo de ${MAX_OPCOES} opções por votação.`);
      return;
    }
    setOpcoes((prev) => [...prev, ""]);
  }

  function removeOpcao(idx: number) {
    if (opcoes.length <= MIN_OPCOES) {
      alert("A votação precisa de ao menos 2 opções.");
      return;
    }
    setOpcoes((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateOpcao(idx: number, value: string) {
    setOpcoes((prev) => prev.map((o, i) => (i === idx ? value : o)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = titleRef.current?.value.trim() ?? "";
    if (!title) {
      alert("Dê um título para a votação.");
      return;
    }
    const texts = opcoes.map((o) => o.trim()).filter(Boolean);
    if (texts.length < 2) {
      alert("Informe ao menos 2 opções.");
      return;
    }

    const formData = new FormData();
    formData.set("titulo", title);
    texts.forEach((t) => formData.append("opcoes", t));
    formData.set("duration", durationRef.current?.value ?? "72");

    startTransition(async () => {
      await createVotacao(formData);
      if (titleRef.current) titleRef.current.value = "";
      setOpcoes(["", ""]);
      if (detailsRef.current) detailsRef.current.open = false;
    });
  }

  return (
    <details ref={detailsRef}>
      <summary className="btn secondary" style={{ display: "inline-block", marginBottom: 16, cursor: "pointer" }}>
        + Nova votação
      </summary>
      <form className="mural-form open" onSubmit={handleSubmit}>
        <div className="mural-form-row">
          <label htmlFor="poll-titulo">Título</label>
          <input id="poll-titulo" type="text" ref={titleRef} required maxLength={200} />
        </div>
        <div className="mural-form-row">
          <label>Opções</label>
          <div className="mural-poll-options">
            {opcoes.map((valor, i) => (
              <div className="mural-poll-opt-row" key={i}>
                <input
                  type="text"
                  className="text-input"
                  placeholder={`Opção ${i + 1}`}
                  value={valor}
                  onChange={(e) => updateOpcao(i, e.target.value)}
                />
                <button type="button" className="poll-opt-remove" onClick={() => removeOpcao(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="mural-add-opt" onClick={addOpcao} style={{ marginTop: 8 }}>
            + adicionar opção
          </button>
        </div>
        <div className="mural-form-row">
          <label htmlFor="poll-duration">Duração</label>
          <select id="poll-duration" ref={durationRef} defaultValue={72}>
            <option value={24}>1 dia</option>
            <option value={72}>3 dias</option>
            <option value={168}>7 dias</option>
            <option value={336}>14 dias</option>
          </select>
        </div>
        <div className="mural-form-actions">
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Publicando..." : "Publicar votação"}
          </button>
        </div>
      </form>
    </details>
  );
}

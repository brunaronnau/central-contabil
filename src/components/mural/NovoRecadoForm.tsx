"use client";

import { useRef, useState, useTransition } from "react";
import { createRecado } from "@/app/actions/mural-recados";

const MURAL_MAX_FILE_BYTES = 5 * 1024 * 1024;

function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NovoRecadoForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const durationRef = useRef<HTMLSelectElement>(null);
  const pinnedRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const tooBig: string[] = [];
    const novos: File[] = [];
    Array.from(e.target.files ?? []).forEach((file) => {
      if (file.size > MURAL_MAX_FILE_BYTES) tooBig.push(file.name);
      else novos.push(file);
    });
    e.target.value = "";
    if (tooBig.length) alert(`Arquivo(s) acima de 5MB não foram anexados: ${tooBig.join(", ")}`);
    setFiles((prev) => [...prev, ...novos]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = textRef.current?.value.trim() ?? "";
    if (!text) {
      alert("Escreva o recado antes de publicar.");
      return;
    }

    const formData = new FormData();
    formData.set("text", text);
    formData.set("duration", durationRef.current?.value ?? "24");
    if (pinnedRef.current?.checked) formData.set("pinned", "on");
    files.forEach((f) => formData.append("files", f));

    startTransition(async () => {
      try {
        await createRecado(formData);
        if (textRef.current) textRef.current.value = "";
        if (pinnedRef.current) pinnedRef.current.checked = false;
        setFiles([]);
        if (detailsRef.current) detailsRef.current.open = false;
      } catch (err) {
        alert(err instanceof Error ? err.message : "Não foi possível publicar o recado.");
      }
    });
  }

  return (
    <details ref={detailsRef}>
      <summary className="btn secondary" style={{ display: "inline-block", marginBottom: 16, cursor: "pointer" }}>
        + Novo recado
      </summary>
      <form className="mural-form open" onSubmit={handleSubmit}>
        <div className="mural-form-row">
          <label htmlFor="recado-text">Mensagem</label>
          <textarea id="recado-text" ref={textRef} required maxLength={2000} />
        </div>
        <div className="mural-form-grid">
          <div className="mural-form-row">
            <label htmlFor="recado-duration">Tempo visível</label>
            <select id="recado-duration" ref={durationRef} defaultValue={24}>
              <option value={6}>6 horas</option>
              <option value={24}>24 horas</option>
              <option value={72}>3 dias</option>
              <option value={168}>7 dias</option>
              <option value={360}>15 dias</option>
              <option value={720}>30 dias</option>
            </select>
          </div>
          <div className="mural-form-row">
            <label htmlFor="recado-files">Anexos (opcional, até 5MB cada, 7MB no total)</label>
            <input id="recado-files" type="file" multiple onChange={handleFilesChange} />
            {files.length > 0 && (
              <div className="mural-file-list">
                {files.map((f, i) => (
                  <span className="mural-file-chip" key={`${f.name}-${i}`}>
                    {f.name} <span style={{ opacity: 0.6 }}>({fmtFileSize(f.size)})</span>
                    <button type="button" onClick={() => removeFile(i)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mural-form-row">
          <label className="small-note" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" ref={pinnedRef} /> Fixar este recado no topo
          </label>
        </div>
        <div className="mural-form-actions">
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </details>
  );
}

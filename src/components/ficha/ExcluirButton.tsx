"use client";

export function ExcluirButton({ action, confirmMsg, label = "Excluir" }: { action: () => void; confirmMsg: string; label?: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMsg)) e.preventDefault();
      }}
    >
      <button type="submit" className="user-del-btn">
        {label}
      </button>
    </form>
  );
}

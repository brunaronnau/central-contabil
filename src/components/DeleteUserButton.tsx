"use client";

export function DeleteUserButton({ action, isMe }: { action: () => void; isMe: boolean }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const msg = isMe
          ? "Remover o seu próprio acesso? Você será desconectado imediatamente. Essa ação não pode ser desfeita."
          : "Remover o acesso deste usuário? Essa ação não pode ser desfeita.";
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <button type="submit" className="user-del-btn">
        {isMe ? "Remover minha conta" : "Remover acesso"}
      </button>
    </form>
  );
}

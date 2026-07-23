# Central Contábil — Navecon

Reformulação da Central Contábil (antes um HTML único com dados só no
navegador — veja [`legacy/`](./legacy)) para **Next.js + Postgres + Docker**,
com dados compartilhados entre toda a equipe.

## Status da migração

Migração feita em fases. Todos os módulos do legado já foram portados — próximos passos ficam a critério de quem for aprimorando a partir daqui (ex: integração real da Agenda com Microsoft 365, refinamentos visuais, novas ferramentas).

- [x] Fundação: Next.js 16 (App Router), Prisma + Postgres, Docker Compose, login (Auth.js)
- [x] Usuários (gestão de acesso)
- [x] Sugestões
- [x] Aniversariantes
- [x] Conciliação Bancária Assistida
- [x] Calculadora de Estoque
- [x] Gestão de Entregas
- [x] Análise Tributária
- [x] Agenda da Controladoria (protótipo com dados de exemplo — aguarda integração Microsoft 365)
- [x] Recados & Metas (Mural) — com backend real (Postgres), diferente do legado que era só localStorage/IndexedDB

## Rodando localmente (com Docker)

1. Copie `.env.example` para `.env` e ajuste se necessário (os valores padrão já funcionam para uso local).
2. Suba o Postgres e a aplicação:

   ```bash
   docker compose up --build
   ```

3. Acesse http://localhost:4010 — a primeira pessoa a criar uma conta vira administradora automaticamente.

Migrations do Prisma rodam sozinhas ao subir o container `app` (veja `docker-entrypoint.sh`).

## Rodando localmente (sem Docker, para desenvolvimento)

1. Suba só o banco: `docker compose up -d db`
2. Instale as dependências: `npm install`
3. Aplique as migrations: `npx prisma migrate dev`
4. Rode o app em modo dev: `npm run dev`

## Stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **Prisma 7** com driver adapter (`@prisma/adapter-pg`) para Postgres
- **Auth.js (NextAuth v5)** — login por e-mail/senha (só e-mails `@navecon.net.br`), com `bcryptjs` para hash de senha
- **Docker Compose** — serviços `app` (Next.js) e `db` (Postgres 16)

## Estrutura

- `src/app/(auth)/` — login e cadastro (páginas públicas)
- `src/app/(app)/` — páginas autenticadas (usam o layout com a barra lateral)
- `src/app/actions/` — Server Actions (mutações)
- `src/lib/` — Prisma client, helpers de sessão
- `prisma/schema.prisma` — schema do banco
- `legacy/` — HTML original, mantido como referência para migrar os módulos que faltam

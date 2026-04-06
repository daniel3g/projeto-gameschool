# Plataforma de Gamificação Escolar

Sistema web que transforma o cotidiano acadêmico do Ensino Fundamental II em uma experiência de progressão estilo RPG. Alunos acumulam XP, sobem de nível, ganham Coins e os trocam por recompensas reais com professores.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (versão estável vigente) — App Router, SSR, Server Actions |
| Banco de dados | Supabase (PostgreSQL 15+) — RLS, PL/pgSQL, triggers, Storage |
| Autenticação | Supabase Auth + Google OAuth 2.0 |
| Hospedagem | Vercel |
| Estilização | Tailwind CSS |

## Documentação do repositório

| Arquivo | Conteúdo |
|---|---|
| `PRODUCT.md` | Visão de produto, perfis, funcionalidades por perfil |
| `ARCHITECTURE.md` | Decisões arquiteturais, camadas, responsabilidades |
| `DATABASE.md` | Modelo físico completo: tabelas, enums, triggers, RLS |
| `FLOWS.md` | Fluxos de usuário passo a passo |
| `RULES.md` | Regras de negócio e validações críticas |
| `ROADMAP.md` | Épicos, histórias e tarefas técnicas na ordem de implementação |
| `TESTING.md` | Critérios de aceite por tela e casos de erro |
| `project-structure.md` | Estrutura de pastas do projeto Next.js |
| `codex-prompts.md` | Prompts prontos para uso com Codex em cada fase |

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha antes de iniciar:

```
NEXT_PUBLIC_SUPABASE_URL=        # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Chave anon (pública)
SUPABASE_SERVICE_ROLE_KEY=       # Chave service_role (privada — nunca expor no cliente)
```

`SUPABASE_SERVICE_ROLE_KEY` é usada exclusivamente em Server Actions privilegiadas (zerar flags de nível, operações administrativas bloqueadas por RLS). Nunca usar em Client Components.

## Ordem de implementação recomendada

A ordem abaixo reflete dependências reais. Não pular etapas.

1. **Infraestrutura** — projeto Next.js, clientes Supabase, middleware de sessão
2. **Migrations** — aplicar os 17 arquivos SQL em `supabase/migrations/` na ordem definida (incluindo `004b_pre_registered_users.sql`)
3. **Seed mínimo** — system user (migration 003), 7 turmas, 1 admin inicial em `pre_registered_users`, `transfer_limit_per_tx = 0`
4. **Supabase Storage** — criar bucket `avatars` (público, 2 MB, JPG/PNG/WEBP) e aplicar policies
5. **Autenticação** — callback OAuth, criação automática de perfil no primeiro login, proteção de rotas
6. **Painel admin (base)** — pré-cadastro de `users`, gerenciamento de turmas

   > O painel admin precisa existir antes de qualquer outra tela: sem usuários pré-cadastrados o sistema não funciona.

7. **Dashboard do aluno** — XP, nível, Coins, modal de nível, histórico, QR Code, avatar
8. **Painel do professor** — visão de turmas, concessão de XP, débito e ajuste de Coins
9. **Transferência de Coins** — entre alunos da mesma turma
10. **Ranking** — geral e por turma, pódio, busca, filtro, paginação
11. **Admin avançado** — moderação de avatar, configurações de limite
12. **Qualidade** — revisão de RLS, testes de trigger, checklist de deploy

Veja `ROADMAP.md` para o detalhamento completo em épicos e tarefas.

## Modelo de criação de perfil

- **Admin pré-cadastra** em `pre_registered_users` (e-mail, `display_name`, `role`, turma). **Nunca insere em `users` diretamente.**
- **No primeiro login via OAuth**, o callback cria `users` com `id = auth.uid()`, depois `students` ou `teachers` conforme o `role`
- `users.id` é **sempre** o `auth.uid()` do Supabase Auth — nunca um UUID gerado manualmente
- Perfis nunca são deletados fisicamente — desativação via `is_active = false`

Veja `FLOWS.md > F01` e `FLOWS.md > F11` para o fluxo completo.

## Primeiros passos

```bash
# 1. Clone o repositório
git clone <repo-url>
cd gamificacao-escolar

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local e preencha as três variáveis

# 4. Aplique as migrations no Supabase
# Acesse o SQL Editor do Supabase e aplique cada arquivo de
# supabase/migrations/ na ordem numérica (001 a 016)
# Veja DATABASE.md para instruções detalhadas e o SQL completo

# 5. Execute o seed mínimo
# Veja DATABASE.md > seção "Seed mínimo obrigatório"

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

## Restrições de domínio

Apenas e-mails `@colegioprogresso.g12.br` podem acessar a plataforma. Além do domínio correto, o e-mail precisa estar pré-cadastrado pelo admin com `is_active = true`.

## Versão atual

`v2.2` — documento fechado. Veja `ROADMAP.md` para o status da implementação.

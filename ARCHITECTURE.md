# ARCHITECTURE.md — Decisões de Arquitetura

## Princípios

1. **Lógica crítica no banco** — progressão de nível, crédito de Coins e validações de saldo vivem em funções PL/pgSQL disparadas por triggers. Nenhuma Edge Function para lógica de progressão.
2. **Server Actions para mutações** — toda escrita que parte da UI passa por Server Action, nunca por chamada direta ao Supabase client no navegador.
3. **RLS como última linha de defesa** — as políticas de Row Level Security garantem que mesmo um bypass na Server Action não exponha dados de outros usuários.
4. **Atomicidade garantida pelo banco** — XP concedido e subida de nível ocorrem na mesma transação SQL; não há risco de inconsistência por falha de rede.
5. **Sem Edge Functions para progressão** — a latência e o risco de timeout de funções serverless são incompatíveis com operações que precisam ser atômicas.

## Camadas

```
Browser
  └── Next.js App Router (SSR / Server Components)
        ├── Server Actions          ← mutações protegidas
        ├── Route Handlers          ← endpoints específicos (ex.: callback OAuth)
        └── Supabase Client (server-side)
              ├── Queries RLS-aware  ← leitura com anon key
              └── Service Role       ← operações privilegiadas (zerar flags, admin)
                    └── PostgreSQL
                          ├── Tabelas + RLS
                          ├── Funções PL/pgSQL
                          └── Triggers
```

## Divisão de responsabilidades

| Operação | Onde roda | Por quê |
|---|---|---|
| Renderização de páginas | Server Component (SSR) | Carregamento seguro, sem exposição de dados |
| Validação de formulários | Frontend + Server Action | UX rápida + validação definitiva no servidor |
| Concessão de XP | Server Action → INSERT `xp_transactions` | RLS garante que só o professor da turma insere |
| Cálculo de nível e Coins | Trigger `fn_process_level_up` | Atômico com o INSERT; sem dependência externa |
| Guarda de saldo negativo | Trigger `fn_guard_coins_balance` | Constraint no banco, não no frontend |
| Limite de transferência | Trigger `fn_guard_transfer_limit` | Validação definitiva no banco |
| Débito/crédito de Coins | Server Action (service_role) → UPDATE `students.coins_balance` + INSERT `coin_transactions` | Saldo nunca negativo (trigger de guarda); apenas `level_reward` atualiza automaticamente |
| Transferência de Coins | Server Action (service_role, transação SQL explícita) | Débito e crédito na mesma transação; aluno não tem policy de INSERT em `coin_transactions` |
| Moderação de avatar | Server Action (admin only) | Storage + `users.avatar_url` |
| Configurações | Server Action (admin only) → `platform_settings` | |
| Zerar flag de nível | Server Action com service_role | RLS bloqueia UPDATE direto pelo usuário |
| Leitura de ranking | Server Component + query ordenada | Cache por revalidação periódica |

## Autenticação

- Provider: Google OAuth 2.0 via Supabase Auth
- Restrição de domínio: `@colegioprogresso.g12.br` configurada no provider
- Dupla barreira: domínio correto **e** e-mail pré-cadastrado com `is_used = false` em `pre_registered_users` (primeiro acesso) ou `is_active = true` em `users` (logins subsequentes)
- Callback verifica `users` primeiro: se existe, é login subsequente; se não, busca `pre_registered_users`

## Exclusão lógica

Nenhum registro é deletado fisicamente. Usuários e turmas são desativados via `is_active = false`. Todos os históricos de XP e Coins são preservados indefinidamente.

## Modelo de criação de perfil (único)

**Invariante absoluta: `users.id` = `auth.uid()` sempre.**

O registro em `users` nunca é criado pelo admin manualmente. Nasce somente no callback OAuth do primeiro login, usando o UUID definitivo gerado pelo Supabase Auth.

| Quem | O que faz | O que NÃO faz |
|---|---|---|
| Admin (painel) | INSERT em `pre_registered_users` (e-mail, `display_name`, `role`, `class_id`/`class_ids`) | Não toca `users`, `students` nem `teachers` |
| Callback OAuth | INSERT em `users` com `id = auth.uid()`; INSERT em `students` ou `teachers`; marca `pre_registered_users.is_used = true` | Não reconcilia UUIDs — não há UUID a reconciliar |

Critério de "primeiro acesso": `users` não tem registro com `id = auth.uid()`.

Veja `FLOWS.md > F01` e `FLOWS.md > F11` para o fluxo completo.

> **OBS-005:** Todas as inserções do callback (users, students, teachers, class_teachers) usam service_role para contornar o RLS, pois o usuário recém-autenticado ainda não tem perfil no banco.

## System user

UUID fixo `00000000-0000-0000-0000-000000000001`, `display_name = 'Sistema'`, `is_active = false`. Usado como `performed_by` em operações automáticas (`level_reward`). Inserido na migration inicial e nunca removido.

> Exceção à invariante: o system user tem UUID fixo pré-definido e `is_active = false`, o que impede qualquer login. É o único registro em `users` que não corresponde a um `auth.uid()` real.

## Triggers vs. service_role

- **Triggers** são disparadas automaticamente pelo PostgreSQL quando uma operação as aciona. Não dependem de chamada externa.
- **service_role** é a chave de API do Supabase com acesso irrestrito. Usada apenas por Server Actions privilegiadas (zerar `pending_level_up`, operações administrativas bloqueadas por RLS).

## Observações de implementação

> **OBS-001:** A versão exata do Next.js não está fixada no documento. Usar a versão estável mais recente no momento da inicialização do projeto (`npx create-next-app@latest`).

> **OBS-002:** O QR Code na v1 é decorativo. Nenhuma rota de leitura/callback de QR precisa ser implementada nesta versão.

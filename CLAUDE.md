# CLAUDE.md

## Contexto do projeto

Estou desenvolvendo a Plataforma de Gamificação Escolar do Colégio Progresso.
Stack: Next.js (App Router, TypeScript), Supabase (PostgreSQL 15+ com RLS + PL/pgSQL), Tailwind CSS, Vercel.
Documento de referência: v2.2 (fechado).

## Restrições obrigatórias

- Lógica de progressão de nível EXCLUSIVAMENTE em triggers PL/pgSQL no banco. Nenhuma Edge Function.
- Ranking baseado em total_xp. Nunca em coins_balance.
- Exclusão de usuários é sempre lógica (is_active=false em users). Nunca DELETE físico.
- display_name fica em users para todos os perfis. teachers não tem display_name próprio.
- QR Code é decorativo na v1. Nenhuma rota de leitura/callback.
- Nenhuma feature fora do escopo do documento v2.2.
- users.id = auth.uid() SEMPRE. Nunca inserir em users com UUID manual nem reconciliar IDs.
- Pré-cadastro vai em pre_registered_users (tabela separada). O callback OAuth cria users/students/teachers no primeiro login.
- Callback verifica users ANTES de pre_registered_users: se users existe, é login subsequente; se não, busca pré-cadastro.
- Aluno NÃO tem policy de INSERT em coin_transactions. Transferências e outras operações de Coins usam service_role na Server Action.
- Apenas level_reward atualiza coins_balance automaticamente (trigger). Todas as outras operações exigem UPDATE explícito em students.coins_balance pela Server Action.
- platform_settings usa UNIQUE NULLS NOT DISTINCT (key, class_id) para funcionar com ON CONFLICT quando class_id é NULL.

## Documentação de referência

Antes de implementar qualquer tarefa, consulte os seguintes arquivos do repositório:

| Arquivo | Conteúdo |
|---|---|
| `DATABASE.md` | Modelo físico, SQL das migrations, RLS, triggers, Storage |
| `FLOWS.md` | Fluxos de usuário passo a passo |
| `RULES.md` | Regras de negócio e validações |
| `ARCHITECTURE.md` | Decisões arquiteturais |
| `PRODUCT.md` | Visão de produto, tabela de níveis e rótulos (1–30) |
| `project-structure.md` | Estrutura de pastas |
| `TESTING.md` | Critérios de aceite |
| `ROADMAP.md` | Épicos, histórias e tarefas (com status de progresso) |
| `codex-prompts.md` | Prompts detalhados por tarefa |

## Status do progresso

Consulte `ROADMAP.md` para o status atualizado. Tarefas marcadas com `[x]` já foram concluídas.

**Épico atual:** ÉPICO 0 — Infraestrutura e base do projeto

**Última tarefa concluída:** (atualizar aqui conforme avança)

**Próxima tarefa:** (atualizar aqui conforme avança)

## Regras para o Claude Code

- Não invente features fora do escopo do documento v2.2.
- Não assuma — se houver ambiguidade, pergunte antes de implementar.
- Antes de criar um arquivo, verifique se ele já existe no projeto.
- Ao criar Server Actions, sempre verificar no DATABASE.md qual cliente usar (anon vs service_role).
- Ao criar componentes, seguir a estrutura de pastas definida em project-structure.md.
- Ao implementar validações, usar schemas Zod na pasta validations/ e consultar RULES.md para as regras.
- Ao implementar qualquer fluxo de Coins, consultar a tabela "Atualização de coins_balance por tipo de operação" em DATABASE.md.

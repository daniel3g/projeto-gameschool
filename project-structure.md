# Estrutura de Pastas — Next.js App Router

```
gamificacao-escolar/
│
├── app/                                  # App Router — rotas e layouts
│   ├── layout.tsx                        # Root layout (fontes, providers globais)
│   ├── page.tsx                          # Redireciona para /login
│   │
│   ├── (auth)/                           # Grupo: rotas públicas (sem layout autenticado)
│   │   ├── login/
│   │   │   └── page.tsx                  # Tela de login com botão Google
│   │   └── error/
│   │       └── page.tsx                  # Erros de autenticação (código via searchParams)
│   │
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts                  # Route Handler: callback OAuth do Supabase
│   │
│   ├── (student)/                        # Grupo: rotas do aluno
│   │   ├── layout.tsx                    # Layout com nav do aluno
│   │   ├── student/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── history/
│   │   │   │   └── page.tsx
│   │   │   ├── qrcode/
│   │   │   │   └── page.tsx
│   │   │   ├── transfer/
│   │   │   │   └── page.tsx
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │
│   ├── (teacher)/                        # Grupo: rotas do professor
│   │   ├── layout.tsx
│   │   ├── teacher/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── class/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── student/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │
│   ├── (admin)/                          # Grupo: rotas do admin
│   │   ├── layout.tsx
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   ├── classes/
│   │   │   │   └── page.tsx
│   │   │   ├── student/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │
│   └── ranking/
│       └── page.tsx                      # Acessível a todos os perfis autenticados
│
├── components/                           # Componentes React reutilizáveis
│   ├── ui/                               # Componentes base (button, input, modal, badge, etc.)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   └── Pagination.tsx
│   │
│   ├── student/                          # Componentes específicos do aluno
│   │   ├── XpBar.tsx                     # Barra de progresso de XP
│   │   ├── LevelUpModal.tsx              # Modal de parabéns ao subir de nível
│   │   ├── CoinHistoryRow.tsx
│   │   ├── XpHistoryRow.tsx
│   │   └── QrCodeCard.tsx
│   │
│   ├── teacher/                          # Componentes do professor
│   │   ├── StudentCard.tsx
│   │   ├── GrantXpForm.tsx
│   │   ├── DebitCoinsForm.tsx
│   │   └── AdjustCoinsForm.tsx
│   │
│   ├── admin/                            # Componentes do admin
│   │   ├── UserTable.tsx
│   │   ├── AddUserForm.tsx
│   │   ├── ClassForm.tsx
│   │   └── SettingsForm.tsx
│   │
│   └── ranking/
│       ├── Podium.tsx                    # Destaque visual do top 3
│       ├── RankingList.tsx
│       ├── RankingFilters.tsx            # Busca + dropdown de turma
│       └── RankingRow.tsx
│
├── lib/                                  # Utilitários e integrações
│   ├── supabase/
│   │   ├── server.ts                     # Cliente Supabase server-side (cookies)
│   │   ├── client.ts                     # Cliente Supabase client-side
│   │   └── service-role.ts              # Cliente com service_role key (Server Actions privilegiadas)
│   │
│   ├── constants/
│   │   ├── levels.ts                     # Mapa de rótulos por nível (1–30)
│   │   ├── xp-table.ts                   # Tabela de XP acumulado por nível
│   │   └── coin-tx-labels.ts            # Tradução de coin_tx_type para PT-BR
│   │
│   └── utils/
│       ├── xp.ts                         # xpForNextLevel(n), xpAccumulated(n), coinsForLevel(n)
│       ├── format.ts                     # formatDate, formatCoins, formatXp
│       └── errors.ts                     # Mapeamento de códigos de erro para mensagens
│
├── actions/                              # Server Actions (mutações)
│   ├── auth/
│   │   └── clear-level-up-flag.ts        # Zera pending_level_up (service_role)
│   │
│   ├── student/
│   │   ├── transfer-coins.ts             # Transferência entre alunos
│   │   └── upload-avatar.ts              # Upload de avatar para Storage
│   │
│   ├── teacher/
│   │   ├── grant-xp.ts                   # Concessão de XP
│   │   ├── purchase-coins.ts             # Débito de Coins (compra)
│   │   └── adjust-coins.ts              # Ajuste manual de Coins
│   │
│   └── admin/
│       ├── create-user.ts                # Pré-cadastro de usuário
│       ├── toggle-user-active.ts         # Ativar / desativar usuário
│       ├── change-student-class.ts       # Trocar turma
│       ├── create-class.ts
│       ├── moderate-avatar.ts            # Remover / substituir avatar
│       └── update-transfer-limit.ts      # Atualizar platform_settings
│
├── validations/                          # Schemas de validação (Zod)
│   ├── grant-xp.schema.ts
│   ├── transfer-coins.schema.ts
│   ├── adjust-coins.schema.ts
│   ├── create-user.schema.ts
│   ├── upload-avatar.schema.ts
│   └── update-transfer-limit.schema.ts
│
├── types/                                # Tipos TypeScript
│   ├── database.ts                       # Tipos gerados ou manuais das tabelas do Supabase
│   ├── student.ts                        # StudentProfile, StudentCard, etc.
│   ├── teacher.ts
│   ├── ranking.ts                        # RankingEntry, RankingFilters
│   └── coin-transaction.ts              # CoinTransactionRow (com tipo traduzido)
│
├── middleware.ts                         # Proteção de rotas por role e sessão
│
├── supabase/
│   ├── migrations/                       # Arquivos SQL na ordem de aplicação
│   │   ├── 001_enums.sql
│   │   ├── 002_users.sql
│   │   ├── 003_system_user_seed.sql
│   │   ├── 004_classes.sql
│   │   ├── 004b_pre_registered_users.sql
│   │   ├── 005_students.sql
│   │   ├── 006_teachers.sql
│   │   ├── 007_class_teachers.sql
│   │   ├── 008_xp_transactions.sql
│   │   ├── 009_coin_transactions.sql
│   │   ├── 010_platform_settings.sql
│   │   ├── 011_indexes.sql
│   │   ├── 012_fn_process_level_up.sql
│   │   ├── 013_fn_guard_coins_balance.sql
│   │   ├── 014_fn_guard_transfer_limit.sql
│   │   ├── 014b_fn_validate_coin_tx.sql
│   │   ├── 015_triggers.sql
│   │   └── 016_rls.sql
│   │
│   └── seeds/
│       └── seed_minimum.sql              # Seed obrigatório: turmas, admin, config global
│
├── public/
│   └── avatar-default.png               # Avatar padrão exibido quando avatar_url = NULL
│
├── .env.example                          # Conteúdo: NEXT_PUBLIC_SUPABASE_URL=, NEXT_PUBLIC_SUPABASE_ANON_KEY=, SUPABASE_SERVICE_ROLE_KEY=
├── .env.local                            # Nunca commitar — cópia local de .env.example com valores reais
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── README.md
├── PRODUCT.md
├── ARCHITECTURE.md
├── DATABASE.md
├── FLOWS.md
├── RULES.md
├── ROADMAP.md
└── TESTING.md
```

## Notas sobre a estrutura

**Grupos de rotas `(auth)`, `(student)`, `(teacher)`, `(admin)`:** os parênteses são a convenção do App Router para agrupar rotas sem afetar o path. Cada grupo tem seu próprio `layout.tsx` com a navegação adequada ao perfil.

**`actions/`:** todas as Server Actions declaradas com `'use server'`. Cada arquivo exporta uma única action. Não usar `'use client'` em nenhum arquivo desta pasta.

**`lib/supabase/service-role.ts`:** este cliente usa a `SUPABASE_SERVICE_ROLE_KEY` (variável de ambiente sem prefixo `NEXT_PUBLIC_`). Nunca importar em Client Components.

**`validations/`:** schemas Zod validados na Server Action antes de qualquer acesso ao banco. O frontend pode reusar os schemas para validação client-side com `zodResolver`.

**`types/database.ts`:** preferir gerar via `supabase gen types typescript` para manter sincronia com o banco. Tipos customizados (joins, views) ficam nos outros arquivos de `types/`. Atenção: `pre_registered_users` deve estar nos tipos gerados mas seus campos não devem ser expostos em componentes de UI — são dados internos do fluxo de autenticação.

**`lib/constants/levels.ts`:** o mapa de rótulos é uma constante local (array ou Record). Não buscar do banco — é dados estáticos definidos no documento.

> **OBS-006:** A separação entre `(teacher)` e `(admin)` nos grupos de rota implica que o admin terá sua própria navegação. Para ações que admin e professor compartilham (como `grant-xp`), a Server Action deve verificar o `role` internamente e aplicar a restrição de turma apenas para `teacher`.

**`supabase/migrations/004b_pre_registered_users.sql`:** esta migration depende de `002_users.sql` (FK `created_by → users.id`) e `004_classes.sql` (FK `class_id → classes.id`). A numeração `004b` garante a ordem correta. Nunca mover para antes de `004_classes.sql`.

**Supabase Storage:** criar o bucket `avatars` manualmente no dashboard do Supabase antes do primeiro uso. Configurar como bucket público (leitura) com limite de 2 MB. Policies de Storage estão documentadas em `DATABASE.md`.

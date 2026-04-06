# ROADMAP.md — Épicos, Histórias e Tarefas Técnicas

Ordem de implementação definida por dependências reais. Não alterar a sequência dos épicos sem revisar as dependências.

---

## ÉPICO 0 — Infraestrutura e base do projeto

Sem este épico, nenhum outro pode ser iniciado.

### H0.1 — Inicializar o projeto

- [ x ] `T0.1.1` Criar projeto Next.js com App Router e TypeScript (`npx create-next-app@latest`)
- [ x ] `T0.1.2` Configurar Tailwind CSS
- [ x ] `T0.1.3` Configurar ESLint, Prettier e `tsconfig.json`
- [ x ] `T0.1.4` Criar repositório Git e estrutura de pastas (ver `project-structure.md`)
- [ x ] `T0.1.5` Criar `.env.example` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### H0.2 — Configurar Supabase

- [ ] `T0.2.1` Criar projeto no Supabase
- [ ] `T0.2.2` Configurar provider Google OAuth (restringir ao domínio `@colegioprogresso.g12.br`)
- [ ] `T0.2.3` Instalar `@supabase/supabase-js` e `@supabase/ssr`
- [ ] `T0.2.4` Criar cliente Supabase para server (`lib/supabase/server.ts`)
- [ ] `T0.2.5` Criar cliente Supabase para client (`lib/supabase/client.ts`)
- [ ] `T0.2.6` Configurar middleware de sessão (`middleware.ts`)

### H0.3 — Aplicar migrations do banco

Seguir a ordem exata definida em `DATABASE.md`.

- [ ] T0.3.1 Aplicar `001_enums.sql`
- [ ] T0.3.2 Aplicar `002_users.sql`
- [ ] T0.3.3 Aplicar `003_system_user_seed.sql`
- [ ] T0.3.4 Aplicar `004_classes.sql`
- [ ] T0.3.4b Aplicar `004b_pre_registered_users.sql`
- [ ] T0.3.5 Aplicar `005_students.sql`
- [ ] T0.3.6 Aplicar `006_teachers.sql`
- [ ] T0.3.7 Aplicar `007_class_teachers.sql`
- [ ] T0.3.8 Aplicar `008_xp_transactions.sql`
- [ ] T0.3.9 Aplicar `009_coin_transactions.sql`
- [ ] T0.3.10 Aplicar `010_platform_settings.sql`
- [ ] T0.3.11 Aplicar `011_indexes.sql`
- [ ] T0.3.12 Aplicar `012_fn_process_level_up.sql`
- [ ] T0.3.13 Aplicar `013_fn_guard_coins_balance.sql`
- [ ] T0.3.14 Aplicar `014_fn_guard_transfer_limit.sql`
- [ ] T0.3.14b Aplicar `014b_fn_validate_coin_tx.sql`
- [ ] T0.3.15 Aplicar `015_triggers.sql`
- [ ] T0.3.16 Aplicar `016_rls.sql`

### H0.4 — Configurar deploy

- [ ] `T0.4.1` Conectar repositório à Vercel
- [ ] `T0.4.2` Configurar variáveis de ambiente na Vercel
- [ ] `T0.4.3` Validar deploy de preview funcionando

### H0.5 — Configurar Supabase Storage

- [ ] `T0.5.1` Criar bucket `avatars` no Supabase (público, limite 2 MB, tipos: image/jpeg, image/png, image/webp)
- [ ] `T0.5.2` Aplicar policies de Storage conforme `DATABASE.md > Supabase Storage`

---

## ÉPICO 1 — Autenticação

Depende de: ÉPICO 0

### H1.1 — Login com Google

- [ ] `T1.1.1` Criar rota de callback OAuth (`app/auth/callback/route.ts`)
- [ ] `T1.1.2` Implementar validação de domínio no callback
- [ ] `T1.1.3` Implementar validação de pré-cadastro no callback: buscar `pre_registered_users` WHERE `email = session.email AND is_used = false`
- [ ] `T1.1.4` Implementar criação automática de perfil no primeiro acesso (tudo com service_role):
  - `INSERT INTO users` com `id = auth.uid()`, `email`/`display_name`/`role` lidos de `pre_registered_users`
  - `role='student'`: `INSERT INTO students` com `class_id` lido de `pre_registered_users.class_id`
  - `role='teacher'`: `INSERT INTO teachers`; depois `INSERT INTO class_teachers` para cada UUID em `pre_registered_users.class_ids`
  - `UPDATE pre_registered_users SET is_used=true, used_at=now()` após criação bem-sucedida
- [ ] `T1.1.5` Implementar redirecionamento por `role` após login
- [ ] `T1.1.6` Criar página de login (`app/(auth)/login/page.tsx`) com botão "Entrar com Google"
- [ ] `T1.1.7` Criar página de erro de autenticação com mensagens específicas por código

### H1.2 — Proteção de rotas

- [ ] `T1.2.1` Configurar middleware para redirecionar usuários não autenticados para `/login`
- [ ] `T1.2.2` Configurar middleware para redirecionar `role` incorreto (ex.: aluno tentando acessar `/teacher/*`)
- [ ] `T1.2.3` Testar fluxo completo: login → redirecionamento correto → logout

---

## ÉPICO 2 — Seed de dados e painel admin (base)

Depende de: ÉPICO 1

O painel admin precisa existir antes das telas de aluno e professor, pois sem dados pré-cadastrados o sistema não funciona.

### H2.1 — Pré-cadastro de usuários

- [ ] `T2.1.1` Criar página `/admin/users` com listagem de usuários
- [ ] `T2.1.2` Criar formulário de adição de usuário (e-mail, `display_name`, `role`, turma)
- [ ] `T2.1.3` Implementar Server Action `createUser`: INSERT em `pre_registered_users` com `email`, `display_name`, `role`, `created_by = auth.uid()` do admin. **Não toca `users`, `students` nem `teachers`** — tudo isso é criado no callback do primeiro login
- [ ] `T2.1.3b` Para `role='student'`: incluir `class_id` no INSERT de `pre_registered_users`
- [ ] `T2.1.3c` Para `role='teacher'`: incluir `class_ids` (array de UUIDs) no INSERT de `pre_registered_users`
- [ ] `T2.1.4` Implementar desativação lógica (`is_active = false`, `deactivated_at`)
- [ ] `T2.1.5` Implementar reativação de usuário
- [ ] `T2.1.6` Indicador visual de "primeiro acesso realizado" (ler `pre_registered_users.is_used`)

### H2.2 — Gerenciamento de turmas

- [ ] `T2.2.1` Criar página `/admin/classes` com listagem de turmas
- [ ] `T2.2.2` Criar formulário para criar e editar turma (`name`, `period`, `grade`)
- [ ] `T2.2.3` Implementar desativação de turma (`is_active = false`)
- [ ] `T2.2.4` Seed manual das 7 turmas iniciais (pode ser via painel ou SQL direto)

### H2.3 — Troca de turma de aluno

- [ ] `T2.3.1` Implementar Server Action `changeStudentClass` (atualiza `students.class_id`)
- [ ] `T2.3.2` Exibir modal de confirmação com aviso de preservação do histórico

---

## ÉPICO 3 — Dashboard do aluno

Depende de: ÉPICO 1, ÉPICO 2 (ao menos um aluno pré-cadastrado)

### H3.1 — Dashboard principal

- [ ] `T3.1.1` Criar página `/student/dashboard` (Server Component)
- [ ] `T3.1.2` Buscar dados do aluno autenticado: `level`, `total_xp`, `coins_balance`, `pending_level_up`
- [ ] `T3.1.3` Exibir avatar (ou padrão), `display_name`, nível, rótulo, saldo
- [ ] `T3.1.4` Implementar barra de XP com preenchimento proporcional
- [ ] `T3.1.5` Criar mapa de rótulos por nível (constante local, baseada na tabela do documento)

### H3.2 — Modal de subida de nível

- [ ] `T3.2.1` Detectar `pending_level_up = true` no carregamento do dashboard
- [ ] `T3.2.2` Exibir modal com novo nível, rótulo e Coins recebidos
- [ ] `T3.2.3` Implementar Server Action `clearLevelUpFlag` (service_role: seta `pending_level_up=false, pending_level=NULL`)
- [ ] `T3.2.4` Fechar modal após confirmação e atualizar dados em tela

### H3.3 — Histórico

- [ ] `T3.3.1` Criar página `/student/history`
- [ ] `T3.3.2` Aba XP: buscar `xp_transactions` do aluno, paginado (10/página), decrescente
- [ ] `T3.3.3` Aba Coins: buscar `coin_transactions` do aluno, paginado (10/página), decrescente
- [ ] `T3.3.4` Traduzir `coin_tx_type` para português na exibição
- [ ] `T3.3.5` Implementar componente de paginação reutilizável

### H3.4 — QR Code

- [ ] `T3.4.1` Criar página `/student/qrcode`
- [ ] `T3.4.2` Gerar QR Code do UUID do aluno usando `qrcode` (npm)
- [ ] `T3.4.3` Exibir `display_name`, turma e nível abaixo do QR Code
- [ ] `T3.4.4` Implementar botão de download da imagem

### H3.5 — Avatar

- [ ] `T3.5.1` Criar página `/student/profile`
- [ ] `T3.5.2` Implementar upload de imagem para Supabase Storage
- [ ] `T3.5.3` Validar formato (JPG/PNG/WEBP) e tamanho (≤ 2 MB) no frontend e na Server Action
- [ ] `T3.5.4` Atualizar `users.avatar_url` após upload bem-sucedido

---

## ÉPICO 4 — Painel do professor

Depende de: ÉPICO 1, ÉPICO 2

### H4.1 — Visão de turmas e alunos

- [ ] `T4.1.1` Criar página `/teacher/dashboard` com listagem das turmas atribuídas
- [ ] `T4.1.2` Criar página `/teacher/class/[id]` com cards de alunos da turma
- [ ] `T4.1.3` Exibir em cada card: `display_name`, nível, rótulo, `total_xp`, `coins_balance`
- [ ] `T4.1.4` Implementar busca por nome na listagem de alunos

### H4.2 — Concessão de XP

- [ ] `T4.2.1` Criar página `/teacher/student/[id]` com perfil do aluno
- [ ] `T4.2.2` Implementar formulário de XP: dropdown (10/25/50/100) + descrição opcional
- [ ] `T4.2.3` Implementar Server Action `grantXp`:
  - Validar `role = 'teacher'` ou `'admin'`
  - Validar vínculo professor-turma
  - Validar `amount` ∈ {10,25,50,100}
  - `INSERT INTO xp_transactions`
- [ ] `T4.2.4` Atualizar dados do aluno em tela após concessão

### H4.3 — Débito de Coins (compra)

- [ ] `T4.3.1` Implementar formulário de débito: valor + descrição
- [ ] `T4.3.2` Implementar Server Action `purchaseCoins`:
  - Validar vínculo professor-turma
  - Validar `coins_balance >= amount`
  - `INSERT INTO coin_transactions` (type=`purchase`)
- [ ] `T4.3.3` Exibir saldo atualizado após operação

### H4.4 — Ajuste manual de Coins

- [ ] `T4.4.1` Implementar formulário de ajuste: tipo (crédito/débito), valor, justificativa
- [ ] `T4.4.2` Implementar Server Action `adjustCoins`:
  - `manual_debit`: validar `description` não vazio
  - `manual_debit`: validar `coins_balance >= amount`
  - Validar vínculo professor-turma
  - `INSERT INTO coin_transactions` (type=`manual_credit` ou `manual_debit`)

---

## ÉPICO 5 — Transferência de Coins entre alunos

Depende de: ÉPICO 3

### H5.1 — Transferência

- [ ] `T5.1.1` Criar página `/student/transfer`
- [ ] `T5.1.2` Buscar colegas da mesma turma (exceto o próprio aluno)
- [ ] `T5.1.3` Implementar formulário: destinatário + valor
- [ ] `T5.1.4` Exibir saldo atual e limite configurado (se > 0)
- [ ] `T5.1.5` Implementar Server Action `transferCoins`:
  - Validar mesmo `class_id`
  - Validar `amount > 0`, remetente ≠ destinatário
  - Validar `coins_balance >= amount`
  - Executar débito e crédito em transação SQL explícita
  - Trigger `trg_guard_transfer_limit` valida o limite no banco
- [ ] `T5.1.6` Exibir confirmação com resumo antes de efetivar

---

## ÉPICO 6 — Ranking

Depende de: ÉPICO 1 (autenticação), ÉPICO 2 (dados existentes)

### H6.1 — Página de ranking

- [ ] `T6.1.1` Criar página `/ranking` (Server Component)
- [ ] `T6.1.2` Implementar query de ranking com ordenação em cascata (`total_xp DESC, xp_grant_count DESC, display_name ASC`)
- [ ] `T6.1.3` Filtrar alunos com `is_active = false`
- [ ] `T6.1.4` Implementar paginação de 20 itens/página
- [ ] `T6.1.5` Exibir pódio visual para top 3 (sem busca ativa)
- [ ] `T6.1.6` Listagem completa a partir do 1º colocado
- [ ] `T6.1.7` Implementar filtro por turma (dropdown de turmas ativas)
- [ ] `T6.1.8` Implementar busca por nome (ILIKE parcial, aplicada na query)
- [ ] `T6.1.9` Ocultar pódio quando busca por nome está ativa
- [ ] `T6.1.10` Exibir pódio no ranking por turma se ≥ 3 alunos
- [ ] `T6.1.11` Mensagem de lista vazia quando nenhum resultado encontrado

---

## ÉPICO 7 — Painel do admin (funcionalidades avançadas)

Depende de: ÉPICO 2

### H7.1 — Dashboard admin

- [ ] `T7.1.1` Criar página `/admin/dashboard` com totais (alunos, professores, turmas, operações recentes)

### H7.2 — Perfil completo do aluno (admin)

- [ ] `T7.2.1` Criar página `/admin/student/[id]` com todas as ações disponíveis
- [ ] `T7.2.2` Concessão de XP sem restrição de turma (reusa Server Action `grantXp` com bypass de turma para admin)
- [ ] `T7.2.3` Ajuste de Coins sem restrição de turma (reusa Server Action `adjustCoins`)

### H7.3 — Moderação de avatar

- [ ] `T7.3.1` Exibir avatar atual do aluno no painel admin
- [ ] `T7.3.2` Implementar Server Action `removeAvatar`:
  - Deletar arquivo do Supabase Storage
  - Setar `users.avatar_url = NULL`
- [ ] `T7.3.3` Implementar Server Action `replaceAvatar` (upload de nova imagem)

### H7.4 — Configurações de transferência

- [ ] `T7.4.1` Criar página `/admin/settings`
- [ ] `T7.4.2` Implementar leitura e exibição de `platform_settings` (global + por turma)
- [ ] `T7.4.3` Implementar Server Action `updateTransferLimit` (upsert em `platform_settings`)
- [ ] `T7.4.4` Exibir data e autor da última alteração

---

## ÉPICO 8 — Qualidade e finalização

Depende de: todos os épicos anteriores

- [ ] `T8.1` Revisar todos os casos de erro mapeados em `RULES.md` e garantir mensagens corretas
- [ ] `T8.2` Testar fluxo completo de primeiro acesso com e-mail real
- [ ] `T8.3` Testar trigger de subida de nível com múltiplos avanços (diretamente no Supabase)
- [ ] `T8.4` Testar constraint de saldo negativo (trigger `fn_guard_coins_balance`)
- [ ] `T8.5` Testar limite de transferência global e por turma
- [ ] `T8.6` Revisar políticas RLS: garantir que aluno não acessa dados de outro aluno
- [ ] `T8.7` Configurar revalidação de cache no ranking
- [ ] `T8.8` Testar comportamento do sistema user (UUID correto nas `coin_transactions` de `level_reward`)
- [ ] `T8.9` Revisar responsividade mobile nas telas principais
- [ ] `T8.10` Configurar domínio customizado na Vercel (se aplicável)

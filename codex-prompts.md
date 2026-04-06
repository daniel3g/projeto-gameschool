# Prompts para Codex — Plataforma de Gamificação Escolar

Usar um prompt por tarefa. Não agrupar múltiplas tarefas em um único prompt.
Sempre incluir o bloco de contexto no início de cada sessão nova.

---

## Bloco de contexto (incluir sempre no início de uma nova sessão)

```
Estou desenvolvendo a Plataforma de Gamificação Escolar do Colégio Progresso.
Stack: Next.js (App Router, TypeScript), Supabase (PostgreSQL 15+ com RLS + PL/pgSQL), Tailwind CSS, Vercel.
Documento de referência: v2.2 (fechado).

Restrições obrigatórias:
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

Quando houver ambiguidade de implementação, pergunte antes de assumir.
```

---

## ÉPICO 0 — Infraestrutura

### P-001 — Inicializar o projeto Next.js

```
[CONTEXTO ACIMA]

Inicialize um projeto Next.js com App Router e TypeScript.
Configure: Tailwind CSS, ESLint, Prettier, tsconfig com paths alias (@/).
Crie a estrutura de pastas conforme descrito abaixo:

app/ (auth)/ (student)/ (teacher)/ (admin)/ ranking/ auth/callback/
components/ ui/ student/ teacher/ admin/ ranking/
lib/ supabase/ constants/ utils/
actions/ auth/ student/ teacher/ admin/
validations/
types/
supabase/migrations/

Crie .env.example com:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

Não instale nenhuma biblioteca além das necessárias para o setup inicial.
```

### P-002 — Clientes Supabase

```
[CONTEXTO ACIMA]

Crie três clientes Supabase em TypeScript:

1. lib/supabase/server.ts — cliente server-side usando @supabase/ssr com cookies()
2. lib/supabase/client.ts — cliente client-side usando createBrowserClient
3. lib/supabase/service-role.ts — cliente com SUPABASE_SERVICE_ROLE_KEY para Server Actions privilegiadas

Regras:
- service-role.ts nunca deve ser importado por Client Components
- Cada arquivo deve exportar uma função que retorna o cliente (não um singleton)
- Usar TypeScript estrito
```

### P-003 — Middleware de sessão e proteção de rotas

```
[CONTEXTO ACIMA]

Crie middleware.ts na raiz do projeto com as seguintes regras:

1. Rotas /login e /auth/callback são públicas
2. Qualquer outra rota requer sessão ativa; sem sessão → redirecionar para /login
3. Após autenticar, verificar o role do usuário em users.role:
   - student → só pode acessar /student/*, /ranking
   - teacher → só pode acessar /teacher/*, /ranking
   - admin → pode acessar /admin/*, /teacher/*, /student/*, /ranking
4. Acesso a rota proibida → redirecionar para o dashboard do próprio role

Use o cliente Supabase SSR para ler a sessão no middleware.
```

---

## ÉPICO 1 — Autenticação

### P-004 — Callback OAuth e criação de perfil

```
[CONTEXTO ACIMA]

Crie app/auth/callback/route.ts (Route Handler GET).

INVARIANTE ABSOLUTA: users.id = auth.uid() SEMPRE.
O admin pré-cadastra em pre_registered_users, não em users.
O registro em users (e students/teachers) só nasce aqui, no primeiro login.
Nunca fazer UPDATE em users.id nem reconciliar UUIDs — não há UUID a reconciliar.

Fluxo obrigatório:
1. Trocar o code pelo token via supabase.auth.exchangeCodeForSession()
   auth.uid() é o UUID definitivo e imutável do Supabase Auth.

2. Verificar que o e-mail termina com @colegioprogresso.g12.br
   → Se não: destruir sessão, redirecionar para /error?code=email_domain_invalid

3. Verificar se users já tem registro com id = auth.uid() (usando service_role)
   → Se SIM: é login subsequente → pular para o passo 7

4. Primeiro acesso — buscar em pre_registered_users WHERE email = session.user.email AND is_used = false
   (usando service_role)
   → Se não encontrado: destruir sessão, redirecionar para /error?code=email_not_precadastrado

5. Primeiro acesso — criar todos os registros com service_role, em ordem:
   a. INSERT INTO users:
        id = auth.uid()
        email = pre_reg.email
        display_name = pre_reg.display_name
        role = pre_reg.role
        is_active = true
   b. Se role='student':
        INSERT INTO students:
          user_id = auth.uid()
          class_id = pre_reg.class_id
          level = 1, total_xp = 0, coins_balance = 0
          qr_code = auth.uid(), pending_level_up = false
   c. Se role='teacher':
        INSERT INTO teachers: { user_id: auth.uid() }
        Para cada uuid em pre_reg.class_ids:
          INSERT INTO class_teachers: { teacher_id: novo_teacher.id, class_id: uuid }
   d. Se role='admin': nenhum registro adicional além de users

6. Marcar pré-cadastro como usado:
   UPDATE pre_registered_users
   SET is_used = true, used_at = now()
   WHERE email = session.user.email

7. Login subsequente — verificar users.is_active:
   → Se is_active = false: destruir sessão, redirecionar para /error?code=usuario_inativo

8. Redirecionar por role:
   - student → /student/dashboard
   - teacher → /teacher/dashboard
   - admin   → /admin/dashboard

Criar também app/(auth)/error/page.tsx que lê o searchParam code e exibe mensagem amigável.
Mapeamento de códigos → mensagens está em RULES.md.
```

### P-005 — Página de login

```
[CONTEXTO ACIMA]

Crie app/(auth)/login/page.tsx.

Requisitos:
- Server Component (sem 'use client')
- Se o usuário já tem sessão ativa, redirecionar para o dashboard do seu role
- Exibir botão "Entrar com Google" que chama supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
- O botão precisa ser um Client Component separado (LoginButton.tsx) pois usa interação
- Layout limpo, sem navegação
- Não exibir campos de e-mail/senha; apenas OAuth
```

---

## ÉPICO 2 — Admin base

### P-006 — Pré-cadastro de usuários

```
[CONTEXTO ACIMA]

Crie a Server Action actions/admin/create-user.ts com as seguintes regras:

INVARIANTE: o admin NUNCA insere em users, students ou teachers.
O pré-cadastro vai exclusivamente em pre_registered_users.
O callback OAuth do primeiro login é o único lugar que cria registros em users/students/teachers.

Parâmetros:
- email: string (obrigatório)
- display_name: string (obrigatório)
- role: 'student' | 'teacher' | 'admin' (obrigatório)
- class_id: uuid (obrigatório quando role='student')
- class_ids: uuid[] (para role='teacher'; pode ser array vazio)

Schema Zod em validations/create-user.schema.ts:
- email: z.string().endsWith('@colegioprogresso.g12.br')
- display_name: z.string().min(1)
- role: z.enum(['student', 'teacher', 'admin'])
- class_id: z.string().uuid().optional() — required quando role='student'
- class_ids: z.array(z.string().uuid()).optional()

Ações:
1. Verificar que o caller tem role='admin' (via session)
2. Verificar que não existe registro com o mesmo email em pre_registered_users
3. INSERT INTO pre_registered_users:
     email, display_name, role,
     class_id (se student),
     class_ids (se teacher, default '{}'),
     created_by = auth.uid() do admin
   Usar service_role para o INSERT
4. Retornar { success: true, preRegistrationId: uuid } ou { error: string }

NÃO fazer nenhum INSERT em users, students, teachers ou class_teachers.
Tudo isso acontece no callback OAuth (P-004) quando o usuário fizer o primeiro login.
```

### P-007 — Desativar e reativar usuário

```
[CONTEXTO ACIMA]

Crie a Server Action actions/admin/toggle-user-active.ts.

Parâmetros: userId (uuid), action ('activate' | 'deactivate')

Regras:
- Caller deve ter role='admin'
- Nunca fazer DELETE — apenas UPDATE em users.is_active
- Para deactivate:
  - UPDATE users SET is_active=false, deactivated_at=now() WHERE id=userId
  - Se o usuário for teacher: DELETE FROM class_teachers WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id=userId)
- Para activate:
  - UPDATE users SET is_active=true, deactivated_at=NULL WHERE id=userId
- Não alterar nenhum registro em xp_transactions ou coin_transactions
- Usar service_role para estas operações

Retornar { success: true } ou { error: string }.
```

---

## ÉPICO 3 — Dashboard do aluno

### P-008 — Dashboard do aluno

```
[CONTEXTO ACIMA]

Crie app/(student)/student/dashboard/page.tsx como Server Component.

Dados a buscar (server-side, com anon client autenticado):
- Perfil do aluno: level, total_xp, coins_balance, pending_level_up, pending_level
- Dados do usuário: display_name, avatar_url
- Nome da turma do aluno

Renderizar:
- Avatar (img com avatar_url ou /public/avatar-default.png se NULL)
- display_name, nível, rótulo do nível (buscar de lib/constants/levels.ts)
- Barra de XP: calcular xpIntoCurrentLevel e xpNeededForNextLevel usando lib/utils/xp.ts
- Saldo de Coins
- Se pending_level_up=true: renderizar <LevelUpModal> como Client Component

Não buscar dados no cliente. Tudo via Server Component + passar props.
```

### P-009 — Funções de XP e mapa de rótulos

```
[CONTEXTO ACIMA]

Crie lib/utils/xp.ts com as funções:

xpForLevel(n: number): number
  → Retorna XP_next(n) = 250 + 35*n + 10*n²

xpAccumulated(n: number): number  
  → Retorna soma de xpForLevel(k) para k=1 até n-1
  → xpAccumulated(1) = 0

xpProgress(totalXp: number, level: number): { current: number; needed: number; percent: number }
  → current = totalXp - xpAccumulated(level)
  → needed = xpForLevel(level)
  → percent = Math.min(100, (current / needed) * 100)

coinsForLevel(n: number): number
  → 4 + Math.ceil(0.8 * n)

Crie lib/constants/levels.ts com o Record<number, string> de rótulos para níveis 1–30.
Valores exatos em PRODUCT.md (tabela de progressão).

Escrever testes unitários simples (Jest ou Vitest) para xpForLevel, xpAccumulated e coinsForLevel.
Verificar: xpForLevel(1)=295, xpForLevel(2)=360, xpAccumulated(5)=1650.
```

### P-010 — Modal de subida de nível

```
[CONTEXTO ACIMA]

Crie components/student/LevelUpModal.tsx como Client Component ('use client').

Props: newLevel (number), newLabel (string), coinsEarned (number), onClose (() => void)

Comportamento:
- Exibir modal com: parabéns, novo nível, rótulo, Coins recebidos
- Botão "Entendido" chama onClose
- onClose deve chamar a Server Action clear-level-up-flag e revalidar o dashboard

Crie actions/auth/clear-level-up-flag.ts:
- Usar service_role (não anon client)
- UPDATE students SET pending_level_up=false, pending_level=NULL WHERE user_id=auth_user_id
- Retornar { success: true }

O modal não deve fechar antes da Server Action completar com sucesso.
```

---

## ÉPICO 4 — Professor: concessão de XP

### P-011 — Server Action: grantXp

```
[CONTEXTO ACIMA]

Crie actions/teacher/grant-xp.ts.

Parâmetros: studentId (uuid), amount (10|25|50|100), description? (string)

Schema Zod em validations/grant-xp.schema.ts:
- studentId: uuid válido
- amount: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
- description: string opcional, máx. 500 caracteres

Validações na action:
1. Verificar que o caller tem role='teacher' ou 'admin'
2. Verificar que o aluno existe e tem is_active=true
3. Se role='teacher': verificar que o aluno pertence a uma turma do professor
   (JOIN students → class_teachers → teachers WHERE teachers.user_id = caller_id)
4. Inserir em xp_transactions: { student_id, granted_by: caller_id, amount, description }

O trigger fn_process_level_up dispara automaticamente após o INSERT.
Não calcular XP ou nível na action — isso é responsabilidade exclusiva do trigger.

Retornar { success: true } ou { error: code }.
Erros possíveis: 'professor_sem_permissao', 'aluno_nao_encontrado', 'xp_valor_invalido'.
```

---

## ÉPICO 5 — Transferência de Coins

### P-012 — Server Action: transferCoins

```
[CONTEXTO ACIMA]

Crie actions/student/transfer-coins.ts.

Parâmetros: toStudentId (uuid), amount (number)

Validações (Zod + na action):
1. Caller deve ter role='student'
2. amount > 0 e é inteiro
3. fromStudent.class_id === toStudent.class_id
4. fromStudent.user_id !== toStudent.user_id (não pode transferir para si mesmo)
5. fromStudent.coins_balance >= amount
   (o trigger fn_guard_coins_balance também protege no banco)

Execução — usar service_role com transação SQL explícita:
IMPORTANTE: O aluno NÃO tem policy de INSERT em coin_transactions (por segurança).
Toda a operação deve usar o cliente service_role.

BEGIN;
  UPDATE students SET coins_balance = coins_balance - amount WHERE id = fromStudentId;
  UPDATE students SET coins_balance = coins_balance + amount WHERE id = toStudentId;
  INSERT INTO coin_transactions (type, from_student_id, to_student_id, performed_by, amount)
    VALUES ('transfer', fromStudentId, toStudentId, caller_user_id, amount);
COMMIT;

Os triggers no banco disparam automaticamente:
- trg_a_validate_coin_tx: valida campos obrigatórios para type='transfer'
- trg_b_guard_transfer_limit: verifica limite antes do INSERT em coin_transactions
- trg_guard_coins_balance: protege contra saldo negativo no UPDATE de students

Se qualquer trigger lançar exceção, capturar e retornar como erro amigável.

Retornar { success: true } ou { error: code }.
```

---

## ÉPICO 6 — Ranking

### P-013 — Página de ranking

```
[CONTEXTO ACIMA]

Crie app/ranking/page.tsx como Server Component.

Aceitar searchParams: turma? (class_id), busca? (string), pagina? (number, default 1)

Query SQL (executar server-side com anon client autenticado):
SELECT
  ROW_NUMBER() OVER (ORDER BY s.total_xp DESC, COUNT(x.id) DESC, u.display_name ASC) AS position,
  u.avatar_url, u.display_name, c.name AS class_name, s.total_xp, COUNT(x.id) AS xp_grant_count,
  s.id AS student_id
FROM students s
JOIN users u ON u.id = s.user_id AND u.is_active = true
JOIN classes c ON c.id = s.class_id
LEFT JOIN xp_transactions x ON x.student_id = s.id
WHERE
  (class_id_param IS NULL OR s.class_id = class_id_param)
  AND (busca_param IS NULL OR u.display_name ILIKE '%' || busca_param || '%')
GROUP BY s.id, u.id, c.id
ORDER BY s.total_xp DESC, COUNT(x.id) DESC, u.display_name ASC
LIMIT 20 OFFSET (pagina - 1) * 20;

Regras de exibição:
- Se busca está ativa (searchParam busca não vazio): pódio oculto
- Se sem busca e sem filtro de turma: exibir pódio com top 3 do geral
- Se filtro de turma sem busca: exibir pódio SE total de alunos na turma >= 3
- Listagem sempre começa do 1º colocado (posição global, não reordenar na turma)
- Paginação: 20 itens/página; pódio fixo no topo
- Lista vazia: mensagem "Nenhum aluno encontrado para os filtros selecionados"

Criar components/ranking/Podium.tsx, RankingList.tsx, RankingFilters.tsx (Client Component para filtros interativos que atualizam a URL via router.push).
```

---

## ÉPICO 7 — Admin avançado

### P-014 — Moderação de avatar

```
[CONTEXTO ACIMA]

Crie actions/admin/moderate-avatar.ts com duas operações:

removeAvatar(userId: string):
1. Verificar que caller tem role='admin'
2. Buscar avatar_url atual do usuário
3. Se avatar_url não é NULL:
   - Deletar o arquivo do Supabase Storage (bucket 'avatars')
   - UPDATE users SET avatar_url=NULL WHERE id=userId (usando service_role)
4. Não notificar o aluno

replaceAvatar(userId: string, file: File):
1. Verificar que caller tem role='admin'
2. Validar: formato JPG/PNG/WEBP, tamanho ≤ 2MB
3. Remover avatar anterior (se existir)
4. Upload do novo arquivo para Storage em avatars/{userId}/{timestamp}.{ext}
5. UPDATE users SET avatar_url=publicUrl WHERE id=userId

Retornar { success: true } ou { error: code }.
Erros: 'avatar_tipo_invalido', 'avatar_tamanho_excedido'.
```

### P-015 — Configurações de transferência

```
[CONTEXTO ACIMA]

Crie actions/admin/update-transfer-limit.ts.

Parâmetros: limit (number, ≥ 0), classId? (uuid | null)
- classId=null → atualiza limite global
- classId=uuid → atualiza override da turma

Validações:
1. Caller deve ter role='admin'
2. limit >= 0 e é inteiro (0 = sem limite)
3. Se classId fornecido, verificar que a turma existe e is_active=true

Execução:
INSERT INTO platform_settings (key, value, class_id, updated_by, updated_at)
VALUES ('transfer_limit_per_tx', limit::text, classId, caller_id, now())
ON CONFLICT (key, class_id) DO UPDATE
  SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at;

NOTA: o ON CONFLICT funciona com class_id=NULL porque a tabela usa
UNIQUE NULLS NOT DISTINCT (key, class_id) — sem isso, NULL seria tratado
como distinto e o upsert criaria duplicatas para o caso global.

Retornar { success: true } ou { error: string }.
```

---

## Prompts de revisão e qualidade

### P-016 — Revisão de RLS

```
[CONTEXTO ACIMA]

Revise as políticas RLS definidas em supabase/migrations/016_rls.sql.

Para cada política, verifique:
1. Um aluno autenticado como user_id=A não consegue ler dados de user_id=B
2. Um professor não consegue ver alunos de turmas que não leciona
3. Nenhum usuário consegue fazer INSERT em xp_transactions sem ser teacher ou admin
4. Nenhum usuário consegue alterar users.role ou users.is_active diretamente (sem service_role)
5. O system user (is_active=false) não consegue autenticar nem executar operações via RLS

Sugira testes SQL para cada ponto acima, para executar no SQL Editor do Supabase.
Não altere nenhuma regra de negócio — apenas avalie a correção das políticas.
```

### P-017 — Revisão do trigger de nível

```
[CONTEXTO ACIMA]

Revise a função fn_process_level_up definida em supabase/migrations/012_fn_process_level_up.sql.

Verifique os seguintes casos:
1. Aluno no nível 1 recebe 300 XP → deve ir para nível 2 (limiar = 295)
2. Aluno no nível 3 com total_xp=1080 recebe 100 XP → deve ir para nível 4 (não para 5)
3. Aluno no nível 30 recebe qualquer XP → total_xp incrementa, nível permanece 30, nenhum erro
4. Aluno recebe XP suficiente para pular 3 níveis em uma única concessão → todos os Coins de cada nível são creditados
5. Cada coin_transaction de level_reward deve ter performed_by='00000000-0000-0000-0000-000000000001'
6. pending_level_up e pending_level são setados corretamente

Gere os INSERTs de teste para cada caso e os SELECTs de verificação.
Não altere a lógica — apenas gere os testes.
```

### P-018 — Checklist final antes do deploy

```
[CONTEXTO ACIMA]

Gere um checklist de verificação antes do primeiro deploy em produção, cobrindo:

1. Banco de dados: todas as 17 migrations aplicadas na ordem correta (incluindo 002b_pre_registered_users.sql); system user presente; RLS habilitado em todas as tabelas
2. Supabase Auth: provider Google configurado; domínio @colegioprogresso.g12.br restrito
3. Variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY configuradas na Vercel
4. Storage: bucket 'avatars' criado com política de acesso público para leitura
5. Seed mínimo aplicado: 7 turmas em classes, admin em pre_registered_users (NÃO em users), transfer_limit_per_tx em platform_settings
6. Verificar que users NÃO tem o admin ainda — ele só aparecerá após o primeiro login
7. Testes manuais: login com e-mail inválido; login com e-mail válido não pré-cadastrado; login válido como student/teacher/admin
8. Teste do trigger: concessão de XP suficiente para subir de nível; verificar pending_level_up=true

Formato: checklist markdown com checkboxes.
```

# TESTING.md — Critérios de Aceite e Casos de Erro

## Critérios de aceite por tela

### `/login`

- [ ] Exibe botão "Entrar com Google"
- [ ] Login com e-mail fora do domínio → erro `email_domain_invalid`
- [ ] Login com e-mail do domínio mas sem registro em `pre_registered_users` → erro `email_not_precadastrado`
- [ ] Login com e-mail já usado (`pre_registered_users.is_used = true`) mas sem `users` → erro `email_not_precadastrado`
- [ ] Login de usuário com `users.is_active = false` (desativado pelo admin pós-primeiro-acesso) → erro `usuario_inativo`
- [ ] Login subsequente (usuário já em `users`) com `pre_registered_users.is_used = true` → funciona normalmente (callback verifica `users` primeiro, pula `pre_registered_users`)
- [ ] Login válido como `student` → redireciona para `/student/dashboard`
- [ ] Login válido como `teacher` → redireciona para `/teacher/dashboard`
- [ ] Login válido como `admin` → redireciona para `/admin/dashboard`

---

### `/student/dashboard`

- [ ] Exibe avatar do aluno (ou imagem padrão se `avatar_url = NULL`)
- [ ] Exibe `display_name`, nível atual, rótulo do nível
- [ ] Exibe XP atual e XP necessário para o próximo nível
- [ ] Barra de progresso com preenchimento proporcional correto
- [ ] Exibe saldo de Coins
- [ ] Se `pending_level_up = true` → modal de parabéns exibido com: novo nível, rótulo, Coins recebidos
- [ ] Fechar modal → `pending_level_up = false` e `pending_level = NULL` no banco
- [ ] Abrir o dashboard novamente → modal não reaparece
- [ ] Links para `/student/history`, `/student/transfer`, `/student/qrcode` visíveis

---

### `/student/history`

- [ ] Aba "XP" exibe lista paginada (10/página), ordem decrescente por `created_at`
- [ ] Cada linha de XP: data/hora, valor de XP, `display_name` do professor, descrição
- [ ] Aba "Coins" exibe lista paginada (10/página), ordem decrescente
- [ ] Cada linha de Coins: data/hora, tipo traduzido, valor com sinal +/-, contraparte, descrição
- [ ] Tipo `level_reward` exibe "Recompensa de nível" e contraparte "Sistema"
- [ ] Paginação funciona (anterior / próximo / indicador de página)
- [ ] Sem registros → estado vazio adequado exibido

---

### `/student/qrcode`

- [ ] QR Code gerado e exibido
- [ ] `display_name`, turma e nível exibidos abaixo do QR
- [ ] Botão de download funciona e salva a imagem

---

### `/student/transfer`

- [ ] Lista apenas colegas da mesma turma (exceto o próprio aluno)
- [ ] Campo de valor aceita apenas inteiros positivos
- [ ] Saldo atual exibido antes da confirmação
- [ ] Se `transfer_limit_per_tx > 0`: limite exibido na tela
- [ ] Modal de confirmação: "Enviar X Coins para [nome]?"
- [ ] Sucesso → saldo atualizado em tela; registro aparece no histórico de ambos
- [ ] `coins_balance < amount` → erro `saldo_insuficiente`
- [ ] `amount > limite` → erro `transfer_limite_excedido`
- [ ] Destinatário de outra turma → erro `transfer_turma_diferente` (não deve aparecer na lista, mas validar no servidor)
- [ ] Remetente = destinatário → bloqueado

---

### `/student/profile`

- [ ] Upload de JPG, PNG, WEBP funciona
- [ ] Arquivo > 2 MB → erro `avatar_tamanho_excedido`
- [ ] Formato inválido → erro `avatar_tipo_invalido`
- [ ] Avatar atualizado reflete no dashboard e no ranking

---

### `/teacher/class/[id]`

- [ ] Exibe apenas alunos da turma do professor
- [ ] Cada card: `display_name`, nível, rótulo, XP, Coins
- [ ] Busca por nome filtra a lista em tempo real ou por submit
- [ ] Clique no card abre `/teacher/student/[id]`
- [ ] Professor não vê alunos de turmas que não leciona

---

### `/teacher/student/[id]`

- [ ] Exibe perfil completo: avatar, `display_name`, nível, XP, Coins
- [ ] Histórico recente de XP e Coins visível (paginado)
- [ ] Formulário de XP: dropdown (10/25/50/100) + descrição opcional
- [ ] `amount` inválido → erro `xp_valor_invalido`
- [ ] Sucesso → XP e nível atualizados; se subiu de nível, `pending_level_up` setado no banco
- [ ] Formulário de débito: valor + descrição; valida saldo
- [ ] `coins_balance < amount` → erro `saldo_insuficiente`
- [ ] Ajuste manual crédito → não exige justificativa
- [ ] Ajuste manual débito sem justificativa → erro `descricao_obrigatoria`
- [ ] Professor tentando acessar aluno de outra turma → erro `professor_sem_permissao` (RLS bloqueia)

---

### `/ranking`

- [ ] Carrega lista ordenada: `total_xp DESC → xp_grant_count DESC → display_name ASC`
- [ ] Pódio visual para top 3 exibido (sem filtro / busca ativos)
- [ ] Listagem completa começa do 1º colocado
- [ ] Paginação: 20 itens/página; pódio fixo no topo
- [ ] Filtro por turma: lista restringida à turma; pódio exibido se ≥ 3 alunos na turma
- [ ] Filtro por turma com < 3 alunos: apenas listagem simples, sem pódio
- [ ] Busca por nome: ILIKE parcial; pódio oculto; resultados corretos
- [ ] Busca + filtro combinados: intersecção correta
- [ ] Aluno com `is_active = false` não aparece
- [ ] Lista vazia → mensagem "Nenhum aluno encontrado para os filtros selecionados"
- [ ] Empate: desempate correto por `xp_grant_count` e depois `display_name`
- [ ] Cada item: posição, avatar, `display_name`, turma, `total_xp`

---

### `/admin/users`

- [ ] Lista todos os usuários com `display_name`, e-mail, `role`, turma e status (ativo/inativo)
- [ ] Formulário de adição aceita e-mail, `display_name`, `role` e turma (obrigatória para `student`)
- [ ] Novo usuário criado sem ter feito o primeiro acesso → indicador visual correto
- [ ] Desativar usuário → modal de confirmação → `is_active = false` gravado
- [ ] Usuário desativado não consegue logar
- [ ] Reativar usuário → `is_active = true`; login restaurado
- [ ] Trocar turma de aluno → modal de aviso → `class_id` atualizado → histórico preservado

---

### `/admin/settings`

- [ ] Campo de limite global exibido com valor atual
- [ ] Overrides por turma exibidos em tabela
- [ ] Salvar → upsert em `platform_settings` com confirmação
- [ ] Data e `display_name` do admin da última alteração visíveis
- [ ] Valor 0 = sem limite; validar que campo não aceita negativos

---

## Testes de banco (executar diretamente no Supabase SQL Editor)

### Trigger de nível — caso básico
```sql
-- Inserir aluno de teste no nível 1 com XP zerado
-- Conceder 300 XP → deve subir para nível 2 (limiar = 295)
-- Verificar: level=2, coins_balance=6, pending_level_up=true, pending_level=2
-- Verificar: coin_transactions com type='level_reward', performed_by=system user UUID
```

### Trigger de nível — múltiplos avanços
```sql
-- Aluno no nível 3 com total_xp=1080
-- Inserir xp_transaction com amount=100 (total_xp passa a 1180)
-- Verificar: level=4 (limiar nível 4 = 1100, atingido; limiar nível 5 = 1650, não atingido)
-- Verificar: coins_balance += 8 (Coins(4) = 4 + ceil(0.8*4) = 4+4 = 8)
```

### Trigger de saldo negativo
```sql
-- Tentar UPDATE students SET coins_balance = -1 WHERE id = :id
-- Deve lançar EXCEPTION 'saldo_insuficiente'
```

### Trigger de limite de transferência
```sql
-- Inserir platform_settings com key='transfer_limit_per_tx', value='50', class_id=NULL
-- Tentar INSERT em coin_transactions com type='transfer', amount=100
-- Deve lançar EXCEPTION 'transfer_limite_excedido'
```

### System user
```sql
-- Verificar que o UUID '00000000-0000-0000-0000-000000000001' existe em users
-- Verificar is_active = false
-- Verificar que coin_transactions de level_reward referenciam este UUID em performed_by
```

### RLS — isolamento entre alunos
```sql
-- Autenticar como aluno A; tentar SELECT em students WHERE user_id = id_do_aluno_B
-- Deve retornar zero linhas
```

### Constraints condicionais de coin_transactions (trigger fn_validate_coin_tx)

```sql
-- level_reward com from_student_id preenchido → deve falhar
INSERT INTO coin_transactions (type, from_student_id, to_student_id, performed_by, amount)
VALUES ('level_reward', :any_student_id, :student_id, '00000000-0000-0000-0000-000000000001', 5);
-- Esperado: EXCEPTION 'coin_tx_invalid: level_reward não pode ter from_student_id'

-- manual_debit sem description → deve falhar
INSERT INTO coin_transactions (type, to_student_id, performed_by, amount, description)
VALUES ('manual_debit', :student_id, :teacher_user_id, 10, NULL);
-- Esperado: EXCEPTION 'descricao_obrigatoria'

-- manual_debit com description vazia → deve falhar
INSERT INTO coin_transactions (type, to_student_id, performed_by, amount, description)
VALUES ('manual_debit', :student_id, :teacher_user_id, 10, '   ');
-- Esperado: EXCEPTION 'descricao_obrigatoria'

-- purchase sem to_teacher_id → deve falhar
INSERT INTO coin_transactions (type, from_student_id, performed_by, amount)
VALUES ('purchase', :student_id, :teacher_user_id, 20);
-- Esperado: EXCEPTION 'coin_tx_invalid: purchase requer to_teacher_id'

-- transfer com remetente = destinatário → deve falhar
INSERT INTO coin_transactions (type, from_student_id, to_student_id, performed_by, amount)
VALUES ('transfer', :student_id, :student_id, :user_id, 10);
-- Esperado: EXCEPTION 'coin_tx_invalid: transfer remetente e destinatário não podem ser iguais'
```

### Seed mínimo — verificação

```sql
-- Verificar 7 turmas ativas
SELECT name, period, grade FROM classes WHERE is_active = true ORDER BY grade, name;
-- Esperado: 7 linhas (6A, 6B, 7A, 8A, 8B, 9A, 9B)

-- Verificar platform_settings global
SELECT key, value, class_id FROM platform_settings WHERE key = 'transfer_limit_per_tx';
-- Esperado: 1 linha com value='0' e class_id=NULL

-- Verificar system user (único registro em users criado manualmente)
SELECT id, email, display_name, is_active FROM users
WHERE id = '00000000-0000-0000-0000-000000000001';
-- Esperado: 1 linha com is_active=false

-- Verificar pré-cadastro do admin inicial
SELECT email, display_name, role, is_used FROM pre_registered_users
WHERE role = 'admin';
-- Esperado: 1 linha com is_used=false (admin ainda não fez o primeiro login)

-- Verificar que users NÃO tem o admin ainda (só será criado no primeiro login)
SELECT COUNT(*) FROM users WHERE role = 'admin' AND email != 'system@colegioprogresso.g12.br';
-- Esperado: 0 (antes do primeiro login do admin)
```

### Primeiro acesso — criação de perfil e marcação de pré-cadastro

```sql
-- Após o primeiro login de um usuário pré-cadastrado como student:

-- 1. Verificar que users foi criado com id = auth.uid() (nunca UUID manual)
SELECT id, email, display_name, role, is_active
FROM users
WHERE email = 'aluno@colegioprogresso.g12.br';
-- Esperado: 1 linha com id = auth.uid() do Supabase Auth

-- 2. Verificar que students foi criado corretamente
SELECT s.user_id, s.level, s.total_xp, s.coins_balance, s.class_id, s.qr_code
FROM students s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'aluno@colegioprogresso.g12.br';
-- Esperado: 1 linha com level=1, total_xp=0, coins_balance=0, qr_code=user_id

-- 3. Verificar que pré-cadastro foi marcado como usado
SELECT email, is_used, used_at
FROM pre_registered_users
WHERE email = 'aluno@colegioprogresso.g12.br';
-- Esperado: is_used=true, used_at preenchido

-- 4. Verificar que users.id = students.user_id = students.qr_code
-- (todos devem ser o mesmo UUID — o auth.uid())
SELECT u.id AS user_id, s.user_id AS student_user_id, s.qr_code
FROM users u
JOIN students s ON s.user_id = u.id
WHERE u.email = 'aluno@colegioprogresso.g12.br';
-- Esperado: as três colunas têm o mesmo valor
```

---

## Checklist de padronização de mensagens

Antes de considerar a implementação concluída, verificar que cada código de erro em `RULES.md` tem:

- [ ] A mensagem correspondente mapeada em `lib/utils/errors.ts`
- [ ] Um teste manual ou automatizado que dispara o erro e exibe a mensagem correta
- [ ] Tratamento adequado na Server Action (retorna `{ error: codigo }`) e na UI (exibe a mensagem)

Codes que precisam de atenção especial (originados no banco, não na Server Action):
- `saldo_insuficiente` — lançado pelo trigger `fn_guard_coins_balance`
- `transfer_limite_excedido` — lançado pelo trigger `fn_guard_transfer_limit`
- `descricao_obrigatoria` — lançado pelo trigger `fn_validate_coin_tx`
- `coin_tx_invalid` — lançado pelo trigger `fn_validate_coin_tx`

Estes chegam ao Next.js como erros PostgreSQL via Supabase. Capturá-los pelo campo `message` ou `code` do erro retornado pelo cliente Supabase e mapear para a mensagem amigável.

---

## Testes adicionais de integridade

### UNIQUE NULLS NOT DISTINCT em platform_settings
```sql
-- Inserir limite global
INSERT INTO platform_settings (key, value, class_id, updated_by)
VALUES ('transfer_limit_per_tx', '50', NULL, '00000000-0000-0000-0000-000000000001');

-- Tentar inserir outro limite global (deve falhar por UNIQUE)
INSERT INTO platform_settings (key, value, class_id, updated_by)
VALUES ('transfer_limit_per_tx', '100', NULL, '00000000-0000-0000-0000-000000000001');
-- Esperado: EXCEPTION unique_violation (sem NULLS NOT DISTINCT, isso criaria duplicata)

-- Upsert deve funcionar
INSERT INTO platform_settings (key, value, class_id, updated_by)
VALUES ('transfer_limit_per_tx', '100', NULL, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (key, class_id) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now();
-- Esperado: 1 linha atualizada, sem duplicata
```

### RLS — aluno não consegue INSERT em coin_transactions
```sql
-- Autenticar como aluno (anon key com sessão de aluno)
-- Tentar INSERT direto em coin_transactions com type='transfer'
-- Esperado: bloqueado pelo RLS (aluno não tem policy de INSERT)
-- A transferência só funciona via Server Action com service_role
```

### Coins balance — UPDATE explícito necessário para purchase/manual
```sql
-- Verificar que após INSERT em coin_transactions (type='purchase'),
-- o coins_balance do aluno NÃO muda automaticamente
-- (diferente de level_reward, onde o trigger atualiza)
-- A Server Action deve fazer o UPDATE em students.coins_balance explicitamente
```

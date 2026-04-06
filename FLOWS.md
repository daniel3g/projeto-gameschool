# FLOWS.md — Fluxos de Usuário

## F01 — Callback OAuth (primeiro acesso e login subsequente)

1. Usuário acessa a URL e clica em "Entrar com Google"
2. Supabase Auth redireciona para Google OAuth
3. Callback recebe o token via `exchangeCodeForSession()` — `auth.uid()` é o UUID definitivo e imutável
4. Callback valida domínio:
   - Domínio é `@colegioprogresso.g12.br` → senão: destruir sessão, erro `email_domain_invalid`
5. Callback verifica se o usuário já existe em `users` com `id = auth.uid()`:
   - **Se existe** → é login subsequente → ir para passo 9
   - **Se não existe** → é primeiro acesso → ir para passo 6
6. Primeiro acesso — buscar `pre_registered_users` WHERE `email = session.email AND is_used = false`:
   - Não encontrado → destruir sessão, erro `email_not_precadastrado`
7. Callback cria os registros com `service_role`:
   - INSERT em `users`: `id = auth.uid()`, `email`, `display_name`, `role` lidos de `pre_registered_users`, `is_active = true`
   - Se `role='student'`: INSERT em `students` com `user_id = auth.uid()`, `class_id` de `pre_registered_users.class_id`, `level=1, total_xp=0, coins_balance=0, qr_code=auth.uid(), pending_level_up=false`
   - Se `role='teacher'`: INSERT em `teachers` com `user_id = auth.uid()`; INSERT em `class_teachers` para cada UUID em `pre_registered_users.class_ids`
   - Se `role='admin'`: nenhum registro adicional além de `users`
8. Callback marca pré-cadastro: `UPDATE pre_registered_users SET is_used=true, used_at=now() WHERE email = session.email`
9. Login subsequente — verificar `users.is_active`:
   - `is_active = false` → destruir sessão, erro `usuario_inativo`
10. Redirecionamento por `role`:
    - `student` → `/student/dashboard`
    - `teacher` → `/teacher/dashboard`
    - `admin` → `/admin/dashboard`

## F02 — Dashboard do aluno (após login)

1. Aluno autenticado chega ao dashboard
2. Server Component busca dados de `students` via `user_id = auth.uid()`
3. Se `pending_level_up = true` → exibe modal de parabéns com novo nível, rótulo e Coins recebidos
4. Ao fechar o modal → Server Action (service_role) seta `pending_level_up = false, pending_level = NULL`
5. Dashboard carregado com dados atualizados

## F03 — Professor concede XP

1. Professor acessa `/teacher/class/[id]` e localiza o aluno
2. Clica em "Conceder XP"; seleciona valor (10 / 25 / 50 / 100) e descrição opcional
3. Server Action valida: professor tem vínculo com a turma (`class_teachers`); `amount` é valor válido
4. `INSERT INTO xp_transactions` (validado por RLS)
5. Trigger `trg_process_level_up` dispara na mesma transação:
   - Incrementa `total_xp`
   - Loop de nível: verifica limiar, sobe nível(is), credita Coins, insere `coin_transactions` por nível
   - Seta `pending_level_up = true` e `pending_level` se houve subida
6. Interface do professor reflete os novos valores do aluno

## F04 — Subida de nível com múltiplos avanços

- Cenário: aluno no nível 3 com `total_xp = 1.080`; professor lança 100 XP
- `total_xp` passa a 1.180
- Loop: limiar do nível 4 = 1.100 XP acumulados → atingido → `level = 4`, +8 Coins
- Loop: limiar do nível 5 = 1.650 XP acumulados → não atingido → loop encerra
- Resultado: `level=4`, `coins_balance += 8`, `pending_level_up=true`, `pending_level=4`
- Nível máximo (30): `total_xp` continua crescendo para o ranking; loop não processa mais subidas; nenhum erro

## F05 — Aluno transfere Coins

1. Aluno acessa `/student/transfer`
2. Seleciona colega da mesma turma (list filtrada por `class_id`)
3. Informa valor
4. Server Action valida: mesmo `class_id`; `coins_balance >= amount`; `amount > 0`; remetente ≠ destinatário
5. Server Action usa `service_role` para executar em transação SQL explícita (BEGIN / COMMIT):
   - `UPDATE students SET coins_balance = coins_balance - amount WHERE id = fromStudentId`
   - `UPDATE students SET coins_balance = coins_balance + amount WHERE id = toStudentId`
   - `INSERT INTO coin_transactions (type, from_student_id, to_student_id, performed_by, amount)`
6. Trigger `trg_a_validate_coin_tx` valida estrutura dos campos
7. Trigger `trg_b_guard_transfer_limit` verifica limite antes do INSERT
8. Trigger `trg_guard_coins_balance` protege contra saldo negativo no UPDATE de `students`
9. `coin_transaction` inserida: `type='transfer'`, `from_student_id`, `to_student_id`, `performed_by = user_id do remetente`

> **OBS-011:** A Server Action de transferência usa `service_role` porque o aluno não tem policy de INSERT em `coin_transactions` (por segurança — evita manipulação direta). Toda a validação de negócio é feita na Server Action e nos triggers do banco.

## F06 — Professor debita Coins (compra / recompensa)

1. Professor acessa `/teacher/student/[id]`
2. Clica em "Débito de Coins"; informa valor e descrição
3. Server Action valida: aluno na turma do professor; `coins_balance >= amount`
4. Server Action executa com `service_role`:
   - `UPDATE students SET coins_balance = coins_balance - amount WHERE id = studentId`
   - `INSERT INTO coin_transactions`: `type='purchase'`, `from_student_id=aluno`, `to_teacher_id=professor`, `performed_by=teacher`
5. Trigger `trg_guard_coins_balance` garante saldo não negativo no UPDATE de `students`
6. Trigger `trg_a_validate_coin_tx` valida campos obrigatórios do tipo `purchase`

> **Nota semântica:** `to_teacher_id` é referência pedagógica de auditoria. Não há transferência financeira real. Os Coins saem do saldo do aluno e o registro é preservado para rastreabilidade.

## F07 — Ajuste manual de Coins (professor ou admin)

1. Professor ou admin acessa perfil do aluno
2. Seleciona "Ajuste manual" → "Adicionar" ou "Remover"
3. Para "Remover": campo de justificativa é obrigatório (validado no frontend e na Server Action)
4. Server Action valida: professor restrito à sua turma; admin sem restrição; para remoção, `coins_balance >= amount`
5. Server Action executa com `service_role`:
   - Para `manual_credit`: `UPDATE students SET coins_balance = coins_balance + amount WHERE id = studentId`
   - Para `manual_debit`: `UPDATE students SET coins_balance = coins_balance - amount WHERE id = studentId`
   - `INSERT INTO coin_transactions`: `type='manual_credit'` ou `'manual_debit'`, `performed_by = teacher ou admin`
6. Trigger `trg_guard_coins_balance` protege contra saldo negativo
7. Trigger `trg_a_validate_coin_tx` valida campos e exige `description` para `manual_debit`

## F08 — QR Code (v1, decorativo)

- Aluno acessa `/student/qrcode`
- Página exibe QR Code gerado do UUID do aluno, `display_name`, turma e nível
- Botão de download disponível
- A leitura do QR Code não dispara nenhuma ação no sistema na v1
- Todas as operações do professor são realizadas pelo painel

## F09 — Admin desativa usuário

1. Admin acessa `/admin/users`
2. Seleciona o usuário e clica em "Desativar"
3. Modal de confirmação exibido
4. Server Action: `UPDATE users SET is_active=false, deactivated_at=now() WHERE id=?`
5. Para professores: vínculos em `class_teachers` são removidos
6. Histórico em `xp_transactions` e `coin_transactions` preservado integralmente
7. Aluno inativo some do ranking imediatamente

## F10 — Admin troca aluno de turma

1. Admin acessa `/admin/users` ou `/admin/student/[id]`
2. Seleciona "Trocar turma" e escolhe a nova turma
3. Modal confirma que o histórico será preservado
4. Server Action: `UPDATE students SET class_id=:nova_turma WHERE id=?`
5. Histórico de XP e Coins não é alterado
6. Novas transferências de Coins só são permitidas com colegas da nova turma

## F11 — Modelo canônico de criação de perfil

**Regra absoluta: `users.id` = `auth.uid()` sempre.**

O registro em `users` nunca é criado manualmente pelo admin. Nasce apenas no callback OAuth do primeiro login.

### O que o admin faz (pré-cadastro)

INSERT em `pre_registered_users` com:
- `email`, `display_name`, `role`
- `class_id` (obrigatório para `role='student'`)
- `class_ids` (array, para `role='teacher'`)
- `created_by` = `auth.uid()` do admin

### O que o callback faz (primeiro acesso E login subsequente)

```
1. Valida domínio @colegioprogresso.g12.br
   → falha: destruir sessão, erro email_domain_invalid

2. Verifica se users já tem registro com id = auth.uid()
   → Se SIM: é login subsequente → pular para o passo 8
   → Se NÃO: é primeiro acesso → continuar para o passo 3

3. Busca pre_registered_users WHERE email = session.email AND is_used = false
   → não encontrado: destruir sessão, erro email_not_precadastrado

4. INSERT INTO users:
     id = auth.uid()           ← UUID definitivo e imutável do Supabase Auth
     email, display_name, role ← lidos de pre_registered_users
     is_active = true

5. Se role='student':
     INSERT INTO students (user_id=auth.uid(), class_id, level=1, ...)

6. Se role='teacher':
     INSERT INTO teachers (user_id=auth.uid())
     INSERT INTO class_teachers para cada uuid em pre_registered_users.class_ids

7. Se role='admin':
     Nenhum registro adicional além de users
   UPDATE pre_registered_users SET is_used=true, used_at=now()
   WHERE email = session.email

8. Verificar users.is_active
   → is_active = false: destruir sessão, erro usuario_inativo

9. Redirecionar por role:
   student → /student/dashboard
   teacher → /teacher/dashboard
   admin   → /admin/dashboard
```

Todas as inserções acima usam service_role (RLS bloquearia inserção de usuário sem perfil ainda).

> **OBS-005:** Verificar "primeiro acesso" por ausência de `users.id = auth.uid()` — se o registro em `users` não existe, é o primeiro login. Não verificar por `students` ou `teachers` diretamente, pois o `users` é criado primeiro e é a fonte de verdade.

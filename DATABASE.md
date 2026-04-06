# DATABASE.md — Modelo Físico do Banco de Dados

## Ordem das migrations

Aplicar nesta sequência exata para respeitar dependências de FK, funções e triggers:

001_enums.sql
002_users.sql
003_system_user_seed.sql
004_classes.sql
004b_pre_registered_users.sql
005_students.sql
006_teachers.sql
007_class_teachers.sql
008_xp_transactions.sql
009_coin_transactions.sql
010_platform_settings.sql
011_indexes.sql
012_fn_process_level_up.sql
013_fn_guard_coins_balance.sql
014_fn_guard_transfer_limit.sql
014b_fn_validate_coin_tx.sql
015_triggers.sql
016_rls.sql

RLS é aplicado por último para que todas as tabelas, funções e triggers já existam antes da criação das políticas.

---

## 001 — Enums

```sql
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE period_type AS ENUM ('morning', 'afternoon');
CREATE TYPE coin_tx_type AS ENUM (
  'level_reward',
  'purchase',
  'transfer',
  'manual_credit',
  'manual_debit'
);
```

---

## 002 — Tabela: users

```sql
CREATE TABLE users (
  id              uuid        PRIMARY KEY,  -- sempre igual ao auth.uid() do Supabase Auth
  email           text        NOT NULL UNIQUE,
  display_name    text        NOT NULL,
  role            user_role   NOT NULL,
  avatar_url      text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deactivated_at  timestamptz
);
```

> `id` é **sempre** o `auth.uid()` gerado pelo Supabase Auth no momento do primeiro login. Nunca é criado manualmente pelo admin. O registro em `users` só nasce quando o usuário faz o primeiro login — o pré-cadastro fica em `pre_registered_users` (ver seção 002b).

---

## 004b — Tabela: pre_registered_users

Tabela de pré-cadastro gerenciada pelo admin. Não tem relação de FK com `users` — é uma lista de e-mails autorizados com metadados de configuração. O registro em `users` (e em `students`/`teachers`) só é criado no primeiro login via OAuth.

```sql
CREATE TABLE pre_registered_users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text        NOT NULL UNIQUE,
  display_name text        NOT NULL,
  role         user_role   NOT NULL,
  -- Para alunos: turma pré-atribuída
  class_id     uuid        REFERENCES classes(id),
  -- Para professores: turmas pré-atribuídas (array de UUIDs de classes)
  class_ids    uuid[],
  -- Auditoria
  is_used      boolean     NOT NULL DEFAULT false,  -- true após o primeiro login
  used_at      timestamptz,                          -- momento do primeiro login
  created_by   uuid        NOT NULL REFERENCES users(id),                 -- admin que criou o registro
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

**Invariantes:**
- `class_id` obrigatório quando `role = 'student'`
- `class_ids` preenchido quando `role = 'teacher'`; pode ser vazio array se ainda não definido
- `is_used = true` e `used_at` preenchidos pelo callback OAuth após criar o perfil em `users`
- Nunca deletar registros desta tabela — serve como log de auditoria do pré-cadastro

```sql
CREATE INDEX idx_pre_reg_email  ON pre_registered_users (email);
CREATE INDEX idx_pre_reg_unused ON pre_registered_users (is_used) WHERE is_used = false;
```

---

## 003 — Seed: system user

```sql
INSERT INTO users (id, email, display_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@colegioprogresso.g12.br',
  'Sistema',
  'admin',
  false
);
```

**Nunca remover este registro.** É referenciado como `performed_by` em operações automáticas de `level_reward`.

---

## 004 — Tabela: classes

```sql
CREATE TABLE classes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  period     period_type NOT NULL,
  grade      smallint    NOT NULL CHECK (grade BETWEEN 6 AND 9),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 005 — Tabela: students

```sql
CREATE TABLE students (
  id               uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid     NOT NULL UNIQUE REFERENCES users(id),
  class_id         uuid     NOT NULL REFERENCES classes(id),
  level            smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 30),
  total_xp         integer  NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  coins_balance    integer  NOT NULL DEFAULT 0 CHECK (coins_balance >= 0),
  pending_level_up boolean  NOT NULL DEFAULT false,
  pending_level    smallint,
  qr_code          text     NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

> `qr_code` deve ser preenchido com o UUID do aluno na criação do perfil.

---

## 006 — Tabela: teachers

```sql
CREATE TABLE teachers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL UNIQUE REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

> `display_name` do professor é lido de `users.display_name` via JOIN.

---

## 007 — Tabela: class_teachers

```sql
CREATE TABLE class_teachers (
  teacher_id uuid NOT NULL REFERENCES teachers(id),
  class_id   uuid NOT NULL REFERENCES classes(id),
  PRIMARY KEY (teacher_id, class_id)
);
```

---

## 008 — Tabela: xp_transactions

```sql
CREATE TABLE xp_transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES students(id),
  granted_by  uuid        NOT NULL REFERENCES users(id),
  amount      smallint    NOT NULL CHECK (amount IN (10, 25, 50, 100)),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

---

## 009 — Tabela: coin_transactions

```sql
CREATE TABLE coin_transactions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  type            coin_tx_type  NOT NULL,
  from_student_id uuid          REFERENCES students(id),
  to_student_id   uuid          REFERENCES students(id),
  to_teacher_id   uuid          REFERENCES teachers(id),
  performed_by    uuid          NOT NULL REFERENCES users(id),
  amount          integer       NOT NULL CHECK (amount > 0),
  description     text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
```

### Constraints por tipo (CHECK de aplicação no backend — ver RULES.md)

| type | from_student_id | to_student_id | to_teacher_id | performed_by | description |
|---|---|---|---|---|---|
| `level_reward` | NULL | NOT NULL | NULL | system user | NULL |
| `purchase` | NOT NULL | NULL | NOT NULL | teacher / admin | NULL (opcional) |
| `transfer` | NOT NULL | NOT NULL | NULL | remetente (user_id) | NULL (opcional) |
| `manual_credit` | NULL | NOT NULL | NULL | teacher / admin | NULL (recomendada) |
| `manual_debit` | NULL | NOT NULL | NULL | teacher / admin | NOT NULL, não vazio |

> As restrições condicionais de `coin_transactions` são implementadas via trigger de validação (ver migration `014b_fn_validate_coin_tx.sql` abaixo), executado antes do INSERT.

---

## 014b — Função: fn_validate_coin_tx (constraints condicionais de coin_transactions)

Valida as regras de nulabilidade por tipo antes de cada INSERT em `coin_transactions`.

```sql
CREATE OR REPLACE FUNCTION fn_validate_coin_tx()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  SYSTEM_USER_ID CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  CASE NEW.type

    WHEN 'level_reward' THEN
      -- from_student_id deve ser NULL
      -- to_student_id deve ser NOT NULL
      -- to_teacher_id deve ser NULL
      -- performed_by deve ser o system user
      IF NEW.from_student_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: level_reward não pode ter from_student_id';
      END IF;
      IF NEW.to_student_id IS NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: level_reward requer to_student_id';
      END IF;
      IF NEW.to_teacher_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: level_reward não pode ter to_teacher_id';
      END IF;
      IF NEW.performed_by <> SYSTEM_USER_ID THEN
        RAISE EXCEPTION 'coin_tx_invalid: level_reward requer performed_by = system user';
      END IF;

    WHEN 'purchase' THEN
      -- from_student_id deve ser NOT NULL
      -- to_student_id deve ser NULL
      -- to_teacher_id deve ser NOT NULL
      IF NEW.from_student_id IS NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: purchase requer from_student_id';
      END IF;
      IF NEW.to_student_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: purchase não pode ter to_student_id';
      END IF;
      IF NEW.to_teacher_id IS NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: purchase requer to_teacher_id';
      END IF;

    WHEN 'transfer' THEN
      -- from_student_id deve ser NOT NULL
      -- to_student_id deve ser NOT NULL
      -- to_teacher_id deve ser NULL
      -- remetente != destinatário
      IF NEW.from_student_id IS NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: transfer requer from_student_id';
      END IF;
      IF NEW.to_student_id IS NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: transfer requer to_student_id';
      END IF;
      IF NEW.to_teacher_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: transfer não pode ter to_teacher_id';
      END IF;
      IF NEW.from_student_id = NEW.to_student_id THEN
        RAISE EXCEPTION 'coin_tx_invalid: transfer remetente e destinatário não podem ser iguais';
      END IF;

    WHEN 'manual_credit' THEN
      -- from_student_id deve ser NULL
      -- to_student_id deve ser NOT NULL
      -- to_teacher_id deve ser NULL
      IF NEW.from_student_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: manual_credit não pode ter from_student_id';
      END IF;
      IF NEW.to_student_id IS NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: manual_credit requer to_student_id';
      END IF;
      IF NEW.to_teacher_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: manual_credit não pode ter to_teacher_id';
      END IF;

    WHEN 'manual_debit' THEN
      -- from_student_id deve ser NULL
      -- to_student_id deve ser NOT NULL
      -- to_teacher_id deve ser NULL
      -- description obrigatória e não vazia
      IF NEW.from_student_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: manual_debit não pode ter from_student_id';
      END IF;
      IF NEW.to_student_id IS NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: manual_debit requer to_student_id';
      END IF;
      IF NEW.to_teacher_id IS NOT NULL THEN
        RAISE EXCEPTION 'coin_tx_invalid: manual_debit não pode ter to_teacher_id';
      END IF;
      IF NEW.description IS NULL OR TRIM(NEW.description) = '' THEN
        RAISE EXCEPTION 'descricao_obrigatoria'
          USING HINT = 'manual_debit requer justificativa não vazia em description';
      END IF;

  END CASE;

  RETURN NEW;
END;
$$;
```

Adicionar à migration `015_triggers.sql`:

```sql
CREATE TRIGGER trg_a_validate_coin_tx
  BEFORE INSERT ON coin_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_validate_coin_tx();
```

> Esta função é a implementação definitiva das constraints condicionais descritas na tabela acima. A validação no banco é a linha de defesa definitiva; a Server Action também valida antes do INSERT por questão de UX.

---

## 010 — Tabela: platform_settings

```sql
CREATE TABLE platform_settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        NOT NULL,
  value      text        NOT NULL,
  class_id   uuid        REFERENCES classes(id),
  updated_by uuid        NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (key, class_id)
);
```

> **OBS-008:** `UNIQUE NULLS NOT DISTINCT` requer PostgreSQL 15+. Sem essa cláusula, o PostgreSQL trata cada NULL como distinto, permitindo múltiplas linhas com o mesmo `key` e `class_id IS NULL` — o que quebraria o `ON CONFLICT` do upsert nas configurações globais.

### Chaves conhecidas

| key | Descrição | Valor padrão |
|---|---|---|
| `transfer_limit_per_tx` | Limite de Coins por transferência (0 = sem limite) | `'0'` |

---

## 011 — Indexes

```sql
CREATE INDEX idx_xp_student      ON xp_transactions (student_id, created_at DESC);
CREATE INDEX idx_coin_from       ON coin_transactions (from_student_id, created_at DESC);
CREATE INDEX idx_coin_to_stu     ON coin_transactions (to_student_id, created_at DESC);
CREATE INDEX idx_coin_type       ON coin_transactions (type, created_at DESC);
CREATE INDEX idx_students_class  ON students (class_id);
CREATE INDEX idx_students_xp     ON students (total_xp DESC);
```

---

## 012 — Função: fn_process_level_up

Disparada após INSERT em `xp_transactions`. Processa subida de nível em loop, incluindo múltiplos avanços em um único lançamento.

```sql
CREATE OR REPLACE FUNCTION fn_process_level_up()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  SYSTEM_USER_ID CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  v_student      students%ROWTYPE;
  v_new_xp       integer;
  v_xp_acc       integer;
  v_k            integer;
  v_coins        integer;
  v_leveled_up   boolean := false;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = NEW.student_id FOR UPDATE;

  v_new_xp := v_student.total_xp + NEW.amount;

  -- Loop de subida de nível (suporta múltiplos avanços)
  WHILE v_student.level < 30 LOOP
    -- Calcula XP acumulado necessário para atingir o próximo nível
    v_xp_acc := 0;
    FOR v_k IN 1..v_student.level LOOP
      v_xp_acc := v_xp_acc + (250 + 35 * v_k + 10 * v_k * v_k);
    END LOOP;

    EXIT WHEN v_new_xp < v_xp_acc;

    v_student.level := v_student.level + 1;
    v_coins := 4 + CEIL(0.8 * v_student.level);
    v_student.coins_balance := v_student.coins_balance + v_coins;
    v_leveled_up := true;

    INSERT INTO coin_transactions (
      type, to_student_id, performed_by, amount
    ) VALUES (
      'level_reward', NEW.student_id, SYSTEM_USER_ID, v_coins
    );
  END LOOP;

  UPDATE students SET
    total_xp         = v_new_xp,
    level            = v_student.level,
    coins_balance    = v_student.coins_balance,
    pending_level_up = CASE WHEN v_leveled_up THEN true ELSE pending_level_up END,
    pending_level    = CASE WHEN v_leveled_up THEN v_student.level ELSE pending_level END
  WHERE id = NEW.student_id;

  RETURN NEW;
END;
$$;
```

---

## 013 — Função: fn_guard_coins_balance

Disparada antes de UPDATE em `students`. Impede saldo negativo.

```sql
CREATE OR REPLACE FUNCTION fn_guard_coins_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.coins_balance < 0 THEN
    RAISE EXCEPTION 'saldo_insuficiente'
      USING HINT = 'coins_balance não pode ser negativo';
  END IF;
  RETURN NEW;
END;
$$;
```

---

## 014 — Função: fn_guard_transfer_limit

Disparada antes de INSERT em `coin_transactions`. Valida limite de transferência.

```sql
CREATE OR REPLACE FUNCTION fn_guard_transfer_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_class_id uuid;
  v_limite   integer;
BEGIN
  IF NEW.type <> 'transfer' THEN
    RETURN NEW;
  END IF;

  SELECT class_id INTO v_class_id
    FROM students WHERE id = NEW.from_student_id;

  -- Busca limite específico da turma
  SELECT value::integer INTO v_limite
    FROM platform_settings
   WHERE key = 'transfer_limit_per_tx' AND class_id = v_class_id;

  -- Fallback: limite global
  IF v_limite IS NULL THEN
    SELECT value::integer INTO v_limite
      FROM platform_settings
     WHERE key = 'transfer_limit_per_tx' AND class_id IS NULL;
  END IF;

  IF v_limite IS NOT NULL AND v_limite > 0 AND NEW.amount > v_limite THEN
    RAISE EXCEPTION 'transfer_limite_excedido'
      USING HINT = format('Limite por transação: %s Coins', v_limite);
  END IF;

  RETURN NEW;
END;
$$;
```

---

## 015 — Triggers

```sql
CREATE TRIGGER trg_process_level_up
  AFTER INSERT ON xp_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_process_level_up();

CREATE TRIGGER trg_guard_coins_balance
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION fn_guard_coins_balance();

-- IMPORTANTE: triggers BEFORE INSERT em coin_transactions executam em ordem
-- alfabética. trg_a_validate roda antes de trg_b_guard para garantir que
-- a validação estrutural (campos obrigatórios por tipo) ocorra antes da
-- validação de limite de transferência.
CREATE TRIGGER trg_a_validate_coin_tx
  BEFORE INSERT ON coin_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_validate_coin_tx();

CREATE TRIGGER trg_b_guard_transfer_limit
  BEFORE INSERT ON coin_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_guard_transfer_limit();
```

---

## 016 — Row Level Security

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_registered_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_teachers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings      ENABLE ROW LEVEL SECURITY;

-- pre_registered_users: apenas admin gerencia; service_role lê no callback
CREATE POLICY pre_reg_admin ON pre_registered_users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
-- Nota: o callback OAuth usa service_role (ignora RLS) para ler pre_registered_users.
-- Nenhuma política de SELECT para usuários comuns — eles nunca precisam ler esta tabela.

-- users: cada um lê o próprio; admin lê todos
CREATE POLICY users_self    ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_admin   ON users FOR ALL    USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- students: aluno vê só o próprio; teacher vê alunos da sua turma; admin tudo
CREATE POLICY students_self    ON students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY students_teacher ON students FOR SELECT USING (
  class_id IN (
    SELECT ct.class_id FROM class_teachers ct
    JOIN teachers t ON t.id = ct.teacher_id
    WHERE t.user_id = auth.uid()
  )
);
CREATE POLICY students_admin   ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- xp_transactions: aluno vê as suas; teacher insere e vê das suas turmas; admin tudo
CREATE POLICY xp_student ON xp_transactions FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY xp_teacher_select ON xp_transactions FOR SELECT USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN class_teachers ct ON ct.class_id = s.class_id
    JOIN teachers t ON t.id = ct.teacher_id
    WHERE t.user_id = auth.uid()
  )
);
CREATE POLICY xp_teacher_insert ON xp_transactions FOR INSERT WITH CHECK (
  student_id IN (
    SELECT s.id FROM students s
    JOIN class_teachers ct ON ct.class_id = s.class_id
    JOIN teachers t ON t.id = ct.teacher_id
    WHERE t.user_id = auth.uid()
  )
);
CREATE POLICY xp_admin ON xp_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- coin_transactions: aluno vê as suas; teacher vê/insere das suas turmas; admin tudo
-- NOTA: alunos NÃO têm policy de INSERT. Transferências de Coins usam service_role na Server Action.
CREATE POLICY coin_student ON coin_transactions FOR SELECT USING (
  from_student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  OR to_student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY coin_teacher_select ON coin_transactions FOR SELECT USING (
  from_student_id IN (
    SELECT s.id FROM students s
    JOIN class_teachers ct ON ct.class_id = s.class_id
    JOIN teachers t ON t.id = ct.teacher_id WHERE t.user_id = auth.uid()
  )
  OR to_student_id IN (
    SELECT s.id FROM students s
    JOIN class_teachers ct ON ct.class_id = s.class_id
    JOIN teachers t ON t.id = ct.teacher_id WHERE t.user_id = auth.uid()
  )
);
CREATE POLICY coin_teacher_insert ON coin_transactions FOR INSERT WITH CHECK (
  from_student_id IN (
    SELECT s.id FROM students s
    JOIN class_teachers ct ON ct.class_id = s.class_id
    JOIN teachers t ON t.id = ct.teacher_id WHERE t.user_id = auth.uid()
  )
  OR to_student_id IN (
    SELECT s.id FROM students s
    JOIN class_teachers ct ON ct.class_id = s.class_id
    JOIN teachers t ON t.id = ct.teacher_id WHERE t.user_id = auth.uid()
  )
);
CREATE POLICY coin_admin ON coin_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- platform_settings: todos leem; apenas admin escreve
CREATE POLICY settings_read  ON platform_settings FOR SELECT USING (true);
CREATE POLICY settings_admin ON platform_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
```

> **OBS-004:** As políticas acima são um ponto de partida. Revisar com `EXPLAIN` em produção para garantir que os subqueries nas políticas não gerem full scans. Considerar o uso de `security definer` functions para simplificar políticas complexas.

---

## Seed mínimo obrigatório

Aplicar após as 17 migrations (incluindo `004b`), antes do primeiro acesso ao sistema.
Salvar em `supabase/seeds/seed_minimum.sql`.

```sql
-- ── 1. System user (já aplicado na migration 003 — aqui apenas para referência) ───
-- Não reaplicar se a migration 003 já foi executada.
-- INSERT INTO users (id, email, display_name, role, is_active)
-- VALUES ('00000000-0000-0000-0000-000000000001',
--         'system@colegioprogresso.g12.br', 'Sistema', 'admin', false);

-- ── 2. Turmas ativas ──────────────────────────────────────────────────────────────
INSERT INTO classes (name, period, grade) VALUES
  ('6 EFAF A', 'morning',   6),
  ('7 EFAF A', 'morning',   7),
  ('8 EFAF A', 'morning',   8),
  ('9 EFAF A', 'morning',   9),
  ('6 EFAF B', 'afternoon', 6),
  ('8 EFAF B', 'afternoon', 8),
  ('9 EFAF B', 'afternoon', 9);

-- ── 3. Admin inicial ──────────────────────────────────────────────────────────────
-- O admin NÃO é inserido em users aqui.
-- O registro em users só nasce no primeiro login via Google OAuth.
-- O pré-cadastro vai em pre_registered_users — isso autoriza o e-mail e define o role.
-- Substituir pelo e-mail real do administrador antes de aplicar.
INSERT INTO pre_registered_users (email, display_name, role, created_by)
VALUES (
  'admin@colegioprogresso.g12.br',
  'Administrador',
  'admin',
  '00000000-0000-0000-0000-000000000001'  -- system user como autor do pré-cadastro inicial
);

-- ── 4. Configuração global de transferência (sem limite por padrão) ───────────────
-- updated_by referencia o system user; será atualizado quando o admin salvar nas settings.
INSERT INTO platform_settings (key, value, class_id, updated_by)
VALUES (
  'transfer_limit_per_tx',
  '0',
  NULL,
  '00000000-0000-0000-0000-000000000001'
);
```

> **OBS-007:** `users.id` é **sempre** o `auth.uid()` do Supabase Auth. Nunca inserir em `users` manualmente com UUID arbitrário. O fluxo correto é: admin pré-cadastra em `pre_registered_users` → usuário faz login → callback cria o registro em `users` com `id = auth.uid()`.

---

## Supabase Storage — Bucket de avatares

Criar manualmente no dashboard do Supabase (ou via CLI) antes do primeiro uso:

| Configuração | Valor |
|---|---|
| Nome do bucket | `avatars` |
| Público | Sim (leitura pública via URL) |
| Tamanho máximo | 2 MB |
| Tipos aceitos | `image/jpeg`, `image/png`, `image/webp` |

### Política de Storage

```sql
-- Leitura pública (qualquer pessoa com a URL pode ver o avatar)
CREATE POLICY avatars_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Upload: apenas o próprio aluno pode enviar para sua pasta
CREATE POLICY avatars_owner_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: apenas o próprio aluno pode substituir seu avatar
CREATE POLICY avatars_owner_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: admin pode remover qualquer avatar (moderação)
-- O próprio aluno também pode deletar o seu para re-upload
CREATE POLICY avatars_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  );
```

> **OBS-009:** O admin usa `service_role` para moderação de avatar, então as policies de Storage não o bloqueiam. As policies acima cobrem o fluxo normal do aluno e servem como defesa adicional.

---

## Atualização de `coins_balance` por tipo de operação

| Tipo de operação | Quem atualiza `students.coins_balance` | Como |
|---|---|---|
| `level_reward` | Trigger `fn_process_level_up` | Automático no loop de nível |
| `transfer` | Server Action `transferCoins` | UPDATE explícito (débito remetente + crédito destinatário) via `service_role` |
| `purchase` | Server Action `purchaseCoins` | UPDATE explícito (débito do aluno) via `service_role` |
| `manual_credit` | Server Action `adjustCoins` | UPDATE explícito (crédito) via `service_role` |
| `manual_debit` | Server Action `adjustCoins` | UPDATE explícito (débito) via `service_role` |

> **OBS-010:** Apenas `level_reward` tem atualização automática via trigger. Todas as outras operações exigem que a Server Action faça o UPDATE em `students.coins_balance` explicitamente, além do INSERT em `coin_transactions`. O trigger `fn_guard_coins_balance` protege contra saldo negativo em todos os casos.

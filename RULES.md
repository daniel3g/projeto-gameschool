# RULES.md — Regras de Negócio e Validações

## Autenticação e acesso

| Regra | Detalhe |
|---|---|
| `AUTH-01` | Apenas e-mails `@colegioprogresso.g12.br` são aceitos pelo provider OAuth |
| `AUTH-02` | No primeiro acesso, o e-mail precisa existir em `pre_registered_users` com `is_used = false` |
| `AUTH-03` | Se o e-mail não estiver em `pre_registered_users` com `is_used = false` no primeiro acesso, a sessão é destruída e o acesso negado |
| `AUTH-04` | No primeiro acesso válido, o callback OAuth cria `users`, `students` ou `teachers` conforme o `role` do pré-cadastro e marca `pre_registered_users.is_used = true` |
| `AUTH-05` | Em logins subsequentes, o acesso depende de existir registro em `users` com `id = auth.uid()` e `is_active = true` |
| `AUTH-06` | Usuários com `users.is_active = false` têm a sessão destruída no callback e nunca chegam ao dashboard |
| `AUTH-07` | O `role` é atribuído no pré-cadastro pelo admin e nunca pode ser alterado pelo próprio usuário |
| `AUTH-08` | `users.id` é sempre igual a `auth.uid()` do Supabase Auth; nunca pode ser criado manualmente pelo admin nem reconciliado depois |
| `AUTH-09` | O callback verifica `users` ANTES de `pre_registered_users`: se `users.id = auth.uid()` já existe, é login subsequente (pular pré-cadastro); se não existe, é primeiro acesso (buscar pré-cadastro) |

Observação de fluxo:
- `pre_registered_users` é usado apenas para autorizar e configurar o primeiro acesso. O campo relevante é `is_used = false` (não confundir com `users.is_active`).
- Após o primeiro login bem-sucedido, o usuário passa a autenticar com base em `users`.
- O registro em `pre_registered_users` permanece apenas para auditoria (`is_used = true` e `used_at` preenchido).
- Ver `FLOWS.md > F01` e `F11` para o fluxo completo do callback com a ordem correta de verificações.

## XP

| Regra | Detalhe |
|---|---|
| `XP-01` | Valores permitidos: 10, 25, 50 ou 100. Nenhum outro valor é aceito |
| `XP-02` | Apenas usuários com `role = 'teacher'` ou `'admin'` podem conceder XP |
| `XP-03` | Professor só pode conceder XP a alunos de suas turmas (`class_teachers`) |
| `XP-04` | XP é permanente: nunca removido, transferido ou zerado |
| `XP-05` | O aluno de destino deve ter `is_active = true` |

## Progressão de nível

| Regra | Detalhe |
|---|---|
| `LEVEL-01` | Fórmula: `XP_next(N) = 250 + 35·N + 10·N²` |
| `LEVEL-02` | XP acumulado para atingir nível N: soma de `XP_next(k)` para k de 1 até N-1 |
| `LEVEL-03` | Múltiplos avanços em um único lançamento são processados em loop dentro do mesmo trigger |
| `LEVEL-04` | Nível máximo: 30. Acima disso, `total_xp` continua crescendo; nenhuma subida é processada |
| `LEVEL-05` | Ao subir de nível: `pending_level_up = true`, `pending_level = novo nível` |
| `LEVEL-06` | Modal de parabéns exibido no próximo login do aluno; flag zerada após exibição |
| `LEVEL-07` | Coins ao subir: `Coins(N) = 4 + ⌈0.8·N⌉` para cada nível percorrido |

## Coins — regras gerais

| Regra | Detalhe |
|---|---|
| `COIN-01` | `coins_balance` nunca pode ser negativo (constraint CHECK + trigger de guarda) |
| `COIN-02` | Professores não possuem saldo de Coins; `to_teacher_id` é apenas referência de auditoria |
| `COIN-03` | Toda movimentação de Coins gera registro em `coin_transactions` com `performed_by` obrigatório |
| `COIN-04` | Apenas `level_reward` atualiza `coins_balance` automaticamente (via trigger). Todas as outras operações (`transfer`, `purchase`, `manual_credit`, `manual_debit`) exigem UPDATE explícito em `students.coins_balance` pela Server Action |

## Coins — transferência entre alunos

| Regra | Detalhe |
|---|---|
| `TRANSFER-01` | Apenas entre alunos com o mesmo `class_id` |
| `TRANSFER-02` | `coins_balance` do remetente >= `amount` |
| `TRANSFER-03` | `amount > 0` e remetente ≠ destinatário |
| `TRANSFER-04` | Se `transfer_limit_per_tx > 0` em `platform_settings`: `amount <= limite` (turma tem prioridade sobre global) |
| `TRANSFER-05` | `performed_by` = `user_id` do aluno remetente |
| `TRANSFER-06` | Server Action usa `service_role` — aluno não tem policy de INSERT em `coin_transactions` por segurança |

## Coins — compra com professor (`purchase`)

| Regra | Detalhe |
|---|---|
| `PURCHASE-01` | Professor deve ter vínculo em `class_teachers` com a turma do aluno |
| `PURCHASE-02` | `from_student_id` = aluno; `to_teacher_id` = professor; `performed_by` = professor ou admin |
| `PURCHASE-03` | Não há transferência financeira real; os Coins saem do saldo do aluno |

## Coins — ajuste manual

| Regra | Detalhe |
|---|---|
| `MANUAL-01` | `manual_debit`: campo `description` é obrigatório e não pode ser string vazia |
| `MANUAL-02` | `manual_debit`: `coins_balance >= amount` |
| `MANUAL-03` | Professor restrito à sua turma; admin pode ajustar qualquer aluno |
| `MANUAL-04` | `performed_by` = `user_id` do professor ou admin que executou |

## Ranking

| Regra | Detalhe |
|---|---|
| `RANK-01` | Base exclusiva: `total_xp` |
| `RANK-02` | Coins não são usados no ranking |
| `RANK-03` | Ordenação em cascata: `total_xp DESC → xp_grant_count DESC → display_name ASC` |
| `RANK-04` | Alunos com `is_active = false` não aparecem no ranking |
| `RANK-05` | Pódio (top 3) exibido no ranking geral sem busca ativa; e por turma se ≥ 3 alunos |
| `RANK-06` | Pódio oculto quando busca por nome está ativa |
| `RANK-07` | Paginação: 20 itens/página na listagem; pódio é fixo, sem paginação |
| `RANK-08` | Busca: ILIKE parcial em `display_name`; aplicada na query, não no resultado carregado |

## Usuários e turmas

| Regra | Detalhe |
|---|---|
| `USER-01` | Nenhum usuário é deletado fisicamente. Remoção = `is_active = false` |
| `USER-02` | Ao desativar professor: vínculos em `class_teachers` são removidos |
| `USER-03` | Troca de turma de aluno: atualiza `students.class_id`; histórico completo preservado |
| `USER-04` | Após troca de turma, transferências só são permitidas com colegas da nova turma |
| `USER-05` | Turmas encerradas: `classes.is_active = false`; alunos vinculados não são afetados automaticamente |

## Avatar

| Regra | Detalhe |
|---|---|
| `AVATAR-01` | Formatos aceitos: JPG, PNG, WEBP |
| `AVATAR-02` | Tamanho máximo: 2 MB |
| `AVATAR-03` | `avatar_url = NULL` → avatar padrão estático exibido |
| `AVATAR-04` | Admin pode remover ou substituir o avatar de qualquer aluno |
| `AVATAR-05` | Remoção de avatar: deleta do Storage + seta `users.avatar_url = NULL`; aluno não é notificado |

## System user

| Regra | Detalhe |
|---|---|
| `SYS-01` | UUID fixo: `00000000-0000-0000-0000-000000000001` |
| `SYS-02` | `is_active = false` permanente; nunca pode logar |
| `SYS-03` | Nunca removido, nunca ter UUID alterado |
| `SYS-04` | Usado como `performed_by` apenas em `coin_transactions` do tipo `level_reward` |

## Erros mapeados

| Código | Causa | Mensagem ao usuário |
|---|---|---|
| `email_not_precadastrado` | E-mail não está em `pre_registered_users` ou `is_used=true` | "Seu acesso não foi habilitado. Fale com a coordenação." |
| `email_domain_invalid` | Domínio incorreto | "Use seu e-mail institucional (@colegioprogresso.g12.br)." |
| `usuario_inativo` | Login com `is_active=false` | "Acesso desativado. Entre em contato com a coordenação." |
| `saldo_insuficiente` | Débito > `coins_balance` | "Saldo insuficiente. O aluno possui X Coins." |
| `transfer_limite_excedido` | `amount` > limite configurado | "Transferência acima do limite de X Coins por operação." |
| `transfer_turma_diferente` | Alunos de turmas distintas | "Transferências só são permitidas entre alunos da mesma turma." |
| `xp_valor_invalido` | `amount` fora de {10,25,50,100} | "Valor de XP inválido." |
| `professor_sem_permissao` | Professor opera aluno de outra turma | "Você não tem permissão para alunos desta turma." |
| `aluno_nao_encontrado` | ID inválido ou aluno inativo | "Aluno não encontrado." |
| `descricao_obrigatoria` | `manual_debit` sem `description` | "Justificativa obrigatória para remoção de Coins." |
| `nivel_maximo` | Aluno já no nível 30 | Nenhum erro; XP acumulado, barra cheia |
| `avatar_tipo_invalido` | Formato não suportado | "Formato não suportado. Use JPG, PNG ou WEBP." |
| `avatar_tamanho_excedido` | Arquivo > 2 MB | "Imagem muito grande. Tamanho máximo: 2 MB." |

# PRODUCT.md — Visão de Produto

## Objetivo

Incentivar alunos do 6º ao 9º ano do Ensino Fundamental II a cumprirem compromissos acadêmicos (entregas, pontualidade, participação) através de mecânicas de RPG: XP, níveis, rótulos e Coins.

## Instituição

Colégio Progresso — domínio `@colegioprogresso.g12.br` (Google Workspace).

## Perfis de usuário

| Perfil | Descrição | role no banco |
|---|---|---|
| Aluno | 6º ao 9º ano | `student` |
| Professor | Docente de qualquer disciplina | `teacher` |
| Admin | Criador da plataforma e/ou coordenação | `admin` |

Todos os perfis autenticam via Google OAuth. O `role` é atribuído no pré-cadastro pelo admin.

## Turmas ativas

| Turma | Período |
|---|---|
| 6 EFAF A | Manhã |
| 7 EFAF A | Manhã |
| 8 EFAF A | Manhã |
| 9 EFAF A | Manhã |
| 6 EFAF B | Tarde |
| 8 EFAF B | Tarde |
| 9 EFAF B | Tarde |

## Funcionalidades por perfil

### Aluno (`/student/*`)

| Rota | O que faz |
|---|---|
| `/student/dashboard` | XP atual, nível, rótulo, barra de progresso, saldo de Coins, modal de subida de nível |
| `/student/history` | Histórico paginado de XP (aba) e Coins (aba), 10 itens/página |
| `/student/qrcode` | QR Code decorativo gerado do UUID do aluno; botão de download |
| `/student/transfer` | Transferir Coins para colegas da mesma turma |
| `/student/profile` | Upload de avatar |

### Professor (`/teacher/*`)

| Rota | O que faz |
|---|---|
| `/teacher/dashboard` | Visão das turmas atribuídas |
| `/teacher/class/[id]` | Lista de alunos da turma com XP, nível e Coins |
| `/teacher/student/[id]` | Conceder XP; débito de Coins (compra); ajuste manual de Coins |

### Admin (`/admin/*`)

| Rota | O que faz |
|---|---|
| `/admin/dashboard` | Totais e operações recentes |
| `/admin/users` | Pré-cadastro, desativação, reativação e troca de turma de alunos |
| `/admin/classes` | Criar e editar turmas |
| `/admin/student/[id]` | Todas as ações sobre qualquer aluno |
| `/admin/settings` | Limite de transferência global e por turma |

### Ranking (`/ranking`)

Acessível a todos os perfis.

- Ranking Geral da Escola (todos os alunos ativos, ordenados por `total_xp`)
- Ranking por Turma (filtro via dropdown)
- Pódio visual para top 3 (geral e por turma se ≥ 3 alunos)
- Busca por nome (ILIKE parcial)
- Paginação: 20 itens/página

## Mecânicas de jogo

### XP
- Concedido por professores ou admin: valores fixos de 10, 25, 50 ou 100
- Permanente: nunca removido, transferido ou zerado
- Base do ranking e do cálculo de nível

### Níveis
- 30 níveis no total
- Progressão calculada por `XP_next(N) = 250 + 35·N + 10·N²`
- Modal de parabéns exibido no próximo login após subir de nível

### Tabela de Progressão Completa (níveis 1–30)

| Nível | Rótulo | XP p/ próx. nível | XP acumulado | Coins ao subir |
|---|---|---|---|---|
| 1 | Estudante Iniciante | 295 | 295 | 5 |
| 2 | Aprendiz Curioso | 360 | 655 | 6 |
| 3 | Explorador do Saber | 445 | 1.100 | 7 |
| 4 | Desbravador do Conhecimento | 550 | 1.650 | 8 |
| 5 | Estrategista em Formação | 675 | 2.325 | 8 |
| 6 | Desafiante Acadêmico | 820 | 3.145 | 9 |
| 7 | Conquistador de Metas | 985 | 4.130 | 10 |
| 8 | Guardião do Progresso | 1.170 | 5.300 | 11 |
| 9 | Arquiteto do Conhecimento | 1.375 | 6.675 | 12 |
| 10 | Mestre do Ritmo Escolar | 1.600 | 8.275 | 12 |
| 11 | Estrategista do Saber | 1.845 | 10.120 | 13 |
| 12 | Mentor em Ascensão | 2.110 | 12.230 | 14 |
| 13 | Especialista em Aprendizado | 2.395 | 14.625 | 15 |
| 14 | Executor de Excelência | 2.700 | 17.325 | 16 |
| 15 | Referência Acadêmica | 3.025 | 20.350 | 16 |
| 16 | Líder do Conhecimento | 3.370 | 23.720 | 17 |
| 17 | Guardião da Disciplina | 3.735 | 27.455 | 18 |
| 18 | Comandante dos Desafios | 4.120 | 31.575 | 19 |
| 19 | Embaixador da Escola | 4.525 | 36.100 | 20 |
| 20 | Ícone Acadêmico | 4.950 | 41.050 | 20 |
| 21 | Mestre da Jornada | 5.395 | 46.445 | 21 |
| 22 | Arquiteto do Futuro | 5.860 | 52.305 | 22 |
| 23 | Visionário do Aprendizado | 6.345 | 58.650 | 23 |
| 24 | Estrategista Supremo | 6.850 | 65.500 | 24 |
| 25 | Lenda em Formação | 7.375 | 72.875 | 24 |
| 26 | Lenda do Conhecimento | 7.920 | 80.795 | 25 |
| 27 | Guardião Supremo | 8.485 | 89.280 | 26 |
| 28 | Mestre Absoluto | 9.070 | 98.350 | 27 |
| 29 | Ícone do Saber | 9.675 | 108.025 | 28 |
| 30 | Lenda Acadêmica | — | — | 28 |

> O nível 30 é o máximo. `total_xp` continua crescendo para o ranking, mas nenhuma subida é processada. A barra de XP permanece cheia na interface.

### Coins
- Ganhos ao subir de nível: `Coins(N) = 4 + ⌈0.8·N⌉`
- Usados para: comprar recompensas com professor, transferir para colegas da mesma turma
- Podem ser ajustados manualmente por professor (com justificativa obrigatória no débito) ou admin
- Não são base de ranking

### QR Code (v1)
- Decorativo — gerado do UUID do aluno
- Não dispara ação no sistema na v1
- O professor acessa o aluno pelo painel, não pelo QR Code

## Avatar
- Upload livre pelo aluno (JPG, PNG, WEBP, máx. 2 MB)
- Admin pode remover ou substituir o avatar de qualquer aluno
- Remoção retorna silenciosamente ao avatar padrão (sem notificação ao aluno)

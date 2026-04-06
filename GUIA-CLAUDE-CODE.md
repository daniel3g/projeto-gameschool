# Guia Prático — Claude Code no VS Code

## 1. Instalação

Abra o terminal e instale o Claude Code globalmente:

```bash
npm install -g @anthropic-ai/claude-code
```

Depois, instale a extensão "Claude Code" no VS Code pelo marketplace de extensões.

## 2. Autenticação

No terminal do VS Code (dentro do seu repositório), rode:

```bash
claude
```

Na primeira vez, ele vai pedir para autenticar. Siga as instruções — vai abrir uma página no navegador para logar com sua conta Anthropic.

## 3. Estrutura do repositório antes de começar

Antes de chamar o Claude Code para qualquer tarefa de código, seu repositório deve estar assim:

```
gamificacao-escolar/
├── CLAUDE.md              ← lido automaticamente pelo Claude Code
├── README.md
├── PRODUCT.md
├── ARCHITECTURE.md
├── DATABASE.md
├── FLOWS.md
├── RULES.md
├── ROADMAP.md
├── TESTING.md
├── project-structure.md
├── codex-prompts.md
├── .env.example
├── .env.local             ← com as 3 variáveis do Supabase preenchidas
├── package.json           ← já criado pelo create-next-app
├── app/
│   └── ...                ← estrutura inicial do Next.js
└── supabase/
    └── migrations/        ← pastas criadas, arquivos SQL ainda vazios
```

## 4. Fluxo de trabalho diário

### Passo 1 — Abrir o projeto

Abra o VS Code na pasta do repositório. O Claude Code vai ler o `CLAUDE.md` automaticamente.

### Passo 2 — Verificar onde parou

Abra o `ROADMAP.md` e veja qual é a próxima tarefa sem `[x]`.

### Passo 3 — Atualizar o CLAUDE.md

Edite a seção "Status do progresso" com o épico atual e a próxima tarefa. Exemplo:

```markdown
**Épico atual:** ÉPICO 1 — Autenticação
**Última tarefa concluída:** T0.4.3 — Validar deploy de preview
**Próxima tarefa:** T1.1.1 — Criar rota de callback OAuth
```

### Passo 4 — Chamar o Claude Code

Abra o terminal integrado do VS Code (Ctrl+`) e digite:

```bash
claude
```

Isso inicia uma sessão interativa. Agora copie o prompt da tarefa do `codex-prompts.md` (sem o bloco `[CONTEXTO ACIMA]` — ele já tem isso pelo CLAUDE.md).

Exemplo prático — em vez de colar o prompt inteiro, você pode ser mais direto:

```
Implemente a tarefa T1.1.1 do ROADMAP.md.
Consulte codex-prompts.md > P-004 para os detalhes da implementação.
Consulte FLOWS.md > F01 para o fluxo completo do callback.
```

O Claude Code vai ler os arquivos referenciados e implementar.

### Passo 5 — Revisar o código gerado

O Claude Code vai mostrar os arquivos que quer criar/editar e pedir confirmação. **Sempre revise antes de aceitar.** Coisas para checar:

- Está usando o cliente Supabase correto? (anon vs service_role)
- As validações do RULES.md estão todas implementadas?
- Os erros mapeados no RULES.md estão sendo retornados corretamente?
- A estrutura de pastas segue o project-structure.md?

### Passo 6 — Testar

Rode o servidor de dev (`npm run dev`) e teste manualmente contra o checklist do `TESTING.md` para a tela em questão.

### Passo 7 — Commitar e atualizar progresso

```bash
git add .
git commit -m "feat: T1.1.1 — callback OAuth com criação de perfil"
```

Depois, marque a tarefa como concluída no `ROADMAP.md`:

```markdown
- [x] `T1.1.1` Criar rota de callback OAuth
```

E atualize o `CLAUDE.md`:

```markdown
**Última tarefa concluída:** T1.1.1 — Callback OAuth
**Próxima tarefa:** T1.1.2 — Validação de domínio no callback
```

## 5. Dicas para melhores resultados

### Tarefas pequenas e focadas

Ruim:
```
Crie todo o painel do professor com visão de turmas, concessão de XP,
débito de Coins e ajuste manual.
```

Bom:
```
Implemente T4.2.3 do ROADMAP.md: Server Action grantXp.
Consulte codex-prompts.md > P-011 para os detalhes.
Consulte RULES.md > seção XP para as validações.
```

### Quando o Claude Code errar

Se ele gerar algo errado, não tente corrigir pedindo "conserte X". É mais eficiente dizer:

```
A implementação de grantXp está usando o cliente anon, mas precisa usar
o cliente autenticado com a sessão do professor para que o RLS valide
o vínculo com a turma. Consulte ARCHITECTURE.md > Divisão de responsabilidades.
Corrija o cliente utilizado.
```

Seja específico sobre o que está errado e aponte o arquivo de referência.

### Sessões longas vs curtas

O Claude Code mantém contexto dentro de uma sessão. Se você está trabalhando no ÉPICO 1 inteiro, pode fazer todas as tarefas na mesma sessão. Mas se mudar de épico, inicie uma nova sessão — o contexto acumulado de outro épico pode atrapalhar.

Para iniciar uma nova sessão limpa:

```bash
claude --new
```

### Revisão de código existente

Você também pode pedir ao Claude Code para revisar em vez de gerar:

```
Revise o arquivo app/auth/callback/route.ts contra o fluxo F01 do FLOWS.md.
Verifique se todas as validações do RULES.md > Autenticação estão implementadas.
Liste qualquer divergência encontrada.
```

## 6. O que NÃO fazer com o Claude Code

- **Não peça para aplicar migrations no Supabase** — faça manualmente no SQL Editor
- **Não peça para configurar OAuth no Supabase** — faça no dashboard
- **Não peça para criar o bucket de Storage** — faça no dashboard
- **Não peça para rodar o seed** — copie do DATABASE.md e execute no SQL Editor
- **Não peça para fazer deploy** — configure a Vercel manualmente
- **Não agrupe mais de 2-3 tarefas por prompt** — qualidade cai
- **Não aceite código sem revisar** — especialmente Server Actions e callbacks

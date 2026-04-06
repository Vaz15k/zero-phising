# ZeroPhishing — Extensão de Segurança

## Pré-requisitos
- Node.js 20+
- npm 10+

## Setup
1. Clone o repositório
2. Instale as dependências:
   \`\`\`bash
   cd extension
   npm install
   \`\`\`
3. Copie o arquivo de variáveis de ambiente:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
4. Preencha o `.env` com as chaves (peça ao Scrum Master)

## Rodando em desenvolvimento
\`\`\`bash
npm run dev        # Chrome
npm run dev:firefox  # Firefox
\`\`\`
A extensão abre automaticamente no navegador com hot reload.

## Estrutura do projeto
| Pasta | Responsabilidade |
|---|---|
| \`entrypoints/\` | background, content script, popup, warning, blocked |
| \`features/\` | lógica de negócio isolada por feature |
| \`components/\` | componentes React reutilizáveis |
| \`services/\` | messaging e storage (chrome APIs) |
| \`types/\` | types globais compartilhados |

## Padrão de commits
Seguimos [Conventional Commits](https://www.conventionalcommits.org/):
- \`feat:\` nova funcionalidade
- \`fix:\` correção de bug
- \`chore:\` configuração, deps, scripts
- \`docs:\` documentação

Sempre referenciar a issue: \`extension: (feat) verificar URL na API (#1)\`
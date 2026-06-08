# ZeroPhishing — Extensão de Segurança

## Pré-requisitos
- Node.js 20+
- npm 10+

## Funcionalidades

- Detecção de phishing via Google Safe Browsing e VirusTotal
- Listas de bloqueio padrão por categoria (adulto, malware, redes sociais, fake news, jogos de azar)
- Regras personalizadas de whitelist/blacklist
- Sincronização de regras na nuvem (com fallback offline)
- Autenticação JWT com suporte a PIN

## Setup
1. Clone o repositório
2. Instale as dependências:
   \`\`\`bash
   cd extension
   npm install
   \`\`\`
3. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
4. Preencha o `.env` com as chaves (peça ao Scrum Master):
   - `WXT_API_URL` - URL da API backend (padrão: `http://127.0.0.1:8000`)
   - `WXT_GOOGLE_SAFE_BROWSING_KEY` - Chave da API Google Safe Browsing (opcional)
   - `WXT_VIRUSTOTAL_KEY` - Chave da API VirusTotal (opcional)

## Rodando em desenvolvimento
\`\`\`bash
npm run dev        # Chrome
npm run dev:firefox  # Firefox
\`\`\`
A extensão abre automaticamente no navegador com hot reload.

## Estrutura do projeto
| Pasta | Responsabilidade |
|---|---|
| `entrypoints/` | background, content script, popup, warning, blocked, options |
| `features/` | lógica de negócio isolada por feature (phishing) |
| `components/` | componentes React reutilizáveis |
| `services/` | API client, messaging e storage (chrome APIs) |
| `types/` | types globais compartilhados |

## Listas de Bloqueio Padrão

A extensão suporta listas pré-definidas de bloqueio por categoria. Para usar:

1. Faça login na página de opções da extensão
2. Clique em "Listas Padrão" no cabeçalho
3. Ative as listas desejadas (adulto, redes sociais, malware, etc.)

Os domínios dessas listas serão bloqueados automaticamente durante a navegação.

**Nota:** As listas são gerenciadas pelo backend. Execute `python manage.py seed_block_lists --fetch` no backend para popular as listas.
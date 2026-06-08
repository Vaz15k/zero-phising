# Zero Phishing

Extensão de segurança contra phishing, malware e controle de acesso com listas de bloqueio padrão.

## Arquitetura

O projeto é composto por dois módulos principais:

- **Backend** (`/backend`) - API REST em Django + Django REST Framework
- **Extensão** (`/extension`) - Extensão de navegador em React + WXT

## Funcionalidades

- Detecção de phishing via Google Safe Browsing e VirusTotal
- Listas de bloqueio padrão por categoria (adulto, malware, redes sociais, fake news, jogos de azar)
- Regras personalizadas de whitelist/blacklist por usuário
- Controle parental
- Sincronização de regras na nuvem (com fallback offline)
- Autenticação JWT com suporte a PIN

## Setup Rápido

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# ou .venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_block_lists --fetch  # Popula listas de bloqueio padrão
python manage.py runserver
```

### Extensão

```bash
cd extension
npm install
cp .env.example .env  # Configure as chaves de API
npm run dev           # Chrome
npm run dev:firefox   # Firefox
```

## Listas de Bloqueio Padrão

As listas são mantidas pelo projeto [StevenBlack/hosts](https://github.com/StevenBlack/hosts) e importadas via comando de seed:

| Categoria | Descrição |
|-----------|-----------|
| `adult` | Conteúdo adulto/pornográfico |
| `social_media` | Redes sociais (Facebook, Instagram, TikTok, etc.) |
| `malware` | Sites com malware e spyware |
| `fakenews` | Sites de notícias falsas |
| `gambling` | Jogos de azar e apostas |

Para popular as listas no banco de dados:

```bash
python manage.py seed_block_lists --fetch
```

## API Endpoints

### Autenticação
- `POST /api/accounts/register/` - Registro
- `POST /api/accounts/login/` - Login com senha
- `POST /api/accounts/pin-login/` - Login com PIN
- `POST /api/accounts/refresh/` - Refresh token JWT

### Listas de Bloqueio
- `GET /api/accounts/block-lists/` - Lista todas as listas padrão
- `POST /api/accounts/block-lists/<id>/activate/` - Ativa lista para o usuário
- `POST /api/accounts/block-lists/<id>/deactivate/` - Desativa lista para o usuário
- `GET /api/accounts/active-block-domains/` - Retorna domínios bloqueados ativos

### Regras Personalizadas
- `GET/POST /api/accounts/url-rules/` - Lista/cria regras
- `GET/DELETE /api/accounts/url-rules/<id>/` - Detalhe/exclui regra

### Controle Parental
- `GET/POST /api/accounts/parental-control/` - Lista/cria vínculos
- `GET/DELETE /api/accounts/parental-control/<id>/` - Detalhe/exclui vínculo

## Documentação Detalhada

- [Backend](/backend/README.md) - Setup e estrutura do backend
- [Extensão](/extension/README.md) - Setup e estrutura da extensão

## Padrão de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` configuração, deps, scripts
- `docs:` documentação

Sempre referenciar a issue: `feat: implementação de feature (#1)`

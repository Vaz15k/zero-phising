# Zero Phishing - Backend

API REST em Django + Django REST Framework para autenticação, gerenciamento de regras de URL e listas de bloqueio padrão.

## Pré-requisitos

- Python 3.10+
- pip

## Setup

```bash
# Criar ambiente virtual
python -m venv .venv

# Ativar ambiente virtual
source .venv/bin/activate  # Linux/Mac
# ou .venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Executar migrações
python manage.py migrate

# (Opcional) Criar superusuário admin
python manage.py createsuperuser

# (Opcional) Popular listas de bloqueio padrão
python manage.py seed_block_lists --fetch

# Rodar servidor
python manage.py runserver
```

## Variáveis de Ambiente

O backend usa SQLite por padrão. Para produção, configure um banco de dados PostgreSQL/MySQL via `config/settings.py`.

## Estrutura do Projeto

```
backend/
├── accounts/           # App principal
│   ├── management/
│   │   └── commands/
│   │       └── seed_block_lists.py  # Comando para popular listas
│   ├── migrations/
│   ├── models.py       # User, ParentalControl, DefaultBlockList, etc.
│   ├── serializers.py  # Serializers DRF
│   ├── views.py        # Views/API endpoints
│   └── urls.py         # Rotas
├── config/             # Configuração Django
│   ├── settings.py
│   └── urls.py
├── manage.py
└── requirements.txt
```

## Modelos

### User
Modelo de usuário customizado com campo `pin` para login rápido.

### ParentalControl
Vincula um guardião a um dependente para controle parental.

### DefaultBlockList
Lista de bloqueio padrão por categoria:
- `adult` - Conteúdo adulto
- `social_media` - Redes sociais
- `malware` - Malware/spyware
- `fakenews` - Fake news
- `gambling` - Jogos de azar

### DefaultBlockListDomain
Domínios pertencentes a uma lista padrão (relação 1:N).

### UserBlockListActivation
Registro de ativação de listas padrão por usuário.

### CustomURLRule
Regras personalizadas de whitelist/blacklist por usuário.

## Comandos de Gerenciamento

### seed_block_lists

Popula o banco com as listas de bloqueio padrão:

```bash
# Cria as listas sem domínios
python manage.py seed_block_lists

# Cria as listas e baixa os domínios das fontes
python manage.py seed_block_lists --fetch
```

As fontes são do projeto [StevenBlack/hosts](https://github.com/StevenBlack/hosts).

## API Endpoints

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/accounts/register/` | Registro de usuário |
| POST | `/api/accounts/login/` | Login com username/email + senha |
| POST | `/api/accounts/pin-login/` | Login com username/email + PIN |
| POST | `/api/accounts/refresh/` | Refresh token JWT |

### Perfil

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/accounts/profile/` | Retorna dados do usuário |
| PUT/PATCH | `/api/accounts/profile/` | Atualiza dados do usuário |

### Listas de Bloqueio Padrão

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/accounts/block-lists/` | Lista todas as listas padrão |
| POST | `/api/accounts/block-lists/<id>/activate/` | Ativa lista para o usuário autenticado |
| POST | `/api/accounts/block-lists/<id>/deactivate/` | Desativa lista para o usuário autenticado |
| GET | `/api/accounts/active-block-domains/` | Retorna todos os domínios bloqueados ativos |

### Regras Personalizadas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/accounts/url-rules/` | Lista regras do usuário |
| POST | `/api/accounts/url-rules/` | Cria nova regra |
| GET | `/api/accounts/url-rules/<id>/` | Detalhe da regra |
| DELETE | `/api/accounts/url-rules/<id>/` | Exclui regra |

### Controle Parental

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/accounts/parental-control/` | Lista vínculos do guardião |
| POST | `/api/accounts/parental-control/` | Cria vínculo |
| GET | `/api/accounts/parental-control/<id>/` | Detalhe do vínculo |
| DELETE | `/api/accounts/parental-control/<id>/` | Remove vínculo |

## Autenticação

A API usa JWT (JSON Web Tokens). Inclua o token no header:

```
Authorization: Bearer <access_token>
```

## Configurações

Principais configurações em `config/settings.py`:

- `CORS_ALLOW_ALL_ORIGINS = True` - Permite CORS de qualquer origem (dev)
- `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME` - 1 dia
- `SIMPLE_JWT.REFRESH_TOKEN_LIFETIME` - 7 dias

## Desenvolvimento

```bash
# Rodar servidor
python manage.py runserver

# Criar migrações após alterar modelos
python manage.py makemigrations
python manage.py migrate

# Shell interativo
python manage.py shell

# Admin
python manage.py createsuperuser
# Acesse http://localhost:8000/admin/
```

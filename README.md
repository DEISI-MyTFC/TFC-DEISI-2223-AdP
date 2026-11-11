# App Relatórios TFC

**GitHub Codespaces:** ambiente completo com PostgreSQL, backend e frontend,
sem serviços externos. O `.env` da raiz é criado automaticamente se não existir;
o ambiente Python, dependências e migrações do backend são preparados no arranque.
Ver [instruções de arranque, atualização e autenticação](.devcontainer/README.md).

Aplicação full-stack para criação, gestão, pré-visualização e exportação de relatórios.

O projeto é composto por:

- Backend: Django, Django REST Framework e JWT em cookies HTTP-only.
- Frontend: React, TypeScript, Vite e Tailwind CSS.
- Base de dados principal: PostgreSQL.
- Base de dados de autenticação: SQLite local em `backend/auth.sqlite3`.
- Autenticação: código por email e Google OAuth.
- Exportações: CSV, JSON e PDF gerados em memória no momento do download.

## Índice

- [Requisitos](#requisitos)
- [Estrutura](#estrutura)
- [Variáveis De Ambiente](#variáveis-de-ambiente)
- [Base De Dados](#base-de-dados)
- [Backend](#backend)
- [Frontend](#frontend)
- [Autenticação](#autenticação)
- [Exportação De Relatórios](#exportação-de-relatórios)
- [Comandos De Validação](#comandos-de-validação)
- [Troubleshooting](#troubleshooting)
- [Setup Rápido](#setup-rápido)
- [Notas De Segurança](#notas-de-segurança)

## Requisitos

O Codespaces já fornece as ferramentas necessárias. Para instalação manual fora
do Codespaces, instala no ambiente onde vais correr a app:

| Ferramenta | Versão recomendada |
|---|---|
| Python | 3.12+ |
| Node.js | 20.19+ ou 22 LTS |
| npm | incluído com Node |
| Docker Desktop | para PostgreSQL local |
| PostgreSQL | 15+, se não usares Docker |

Verificação rápida:

```powershell
python --version
node -v
npm -v
docker --version
```

## Estrutura

```text
app-relatorios-tfc/
  backend/
    api/
    core/
    requirements.txt
    manage.py
    .env.example
  frontend/
    src/
    package.json
    package-lock.json
    .env.example
    .nvmrc
  docker-compose.yml
  .env.example
  README.md
```

## Variáveis De Ambiente

Existem três ficheiros de ambiente:

- `.env`: usado pelo `docker-compose.yml` para criar o PostgreSQL.
- `backend/.env`: usado pelo Django.
- `frontend/.env`: usado pelo Vite/React.

No **Codespaces**, o `.env` da raiz fornece as credenciais PostgreSQL tanto ao
servidor como ao Django. É criado a partir de `.devcontainer/.env.example` apenas
se não existir; um ficheiro existente é preservado. O `backend/.env` é opcional
para outras definições, e as credenciais recebidas do Compose têm prioridade.
Os passos de cópia abaixo destinam-se à instalação manual fora do Codespaces.

Os ficheiros reais `.env` não devem ser versionados. Usa os exemplos:

```cmd line 
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Raiz Do Projeto

Ficheiro: `.env`

```env
POSTGRES_DB=tfc_bd
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=change-me
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
```

### Backend

Ficheiro: `backend/.env`

```env
DJANGO_SECRET_KEY=change-me
DEBUG=True

POSTGRES_DB=tfc_bd
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=change-me
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-email-app-password
DEFAULT_FROM_EMAIL="Ares do Pinhal <your-email@example.com>"

OTP_CODE_EXPIRY_MINUTES=10
OTP_CODE_LENGTH=6
```

Gerar uma `DJANGO_SECRET_KEY`:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### Frontend

Ficheiro: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Base De Dados

### Opção Recomendada: Docker

Na raiz do projeto:

```powershell
docker compose up -d
```

Verificar:

```powershell
docker ps
```

Parar:

```powershell
docker compose down
```

### Nota Sobre As Bases De Dados

O backend usa duas bases:

- `default`: PostgreSQL, para as tabelas de dados consultadas pelos relatórios.
- `auth_db`: SQLite, para autenticação, utilizadores e todos os modelos da app
  `api`, incluindo `OTPChallenge` e `SavedReport`.

O ficheiro SQLite é criado em:

```text
backend/auth.sqlite3
```

O `AuthRouter` em `backend/core/dbrouters.py` encaminha a app `api` para SQLite:
as migrações criam `api_otpchallenge` e `api_savedreport` neste ficheiro. O modelo
`SavedReport` não está registado em `backend/api/admin.py`, pelo que não aparece
automaticamente no admin. O comando `migrate --database=default` pode registar
migrações como aplicadas mesmo quando o router não cria essas tabelas no PostgreSQL.

No estado atual de `master` e `workingEnv`, o repositório **não inclui o modelo
relacional de negócio completo**, nem um schema/dump que o crie. O seed do
Codespaces, `.devcontainer/seed.sql`, cria apenas `demo_projects` e `demo_tasks`.
O backend de relatórios consulta as tabelas e relações já existentes no PostgreSQL;
para usar o modelo real é necessário obter e importar o seu schema/migrações.

No Codespaces, abre este ficheiro com **SQLite Viewer de Florian Klampfer**
(`qwtel.sqlite-viewer`). O viewer permite consultar/filtrar tabelas em modo de
leitura; para executar SQL usa o `sqlite3` já instalado, a partir da raiz:

```bash
sqlite3 -readonly -header -column backend/auth.sqlite3 "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

O `backend/.env` continua opcional no Codespaces: é lido se existir, mas não é
copiado automaticamente de `.env.example`. As variáveis recebidas do Compose
têm prioridade, e `core.codespaces_settings` seleciona o email local em ficheiros.
Ver [ficheiros de ambiente e localização das tabelas](.devcontainer/README.md#which-environment-file-is-used).

## Backend

### GitHub Codespaces: Arranque Automático

O contentor cria o ambiente virtual **`/opt/venv`** e instala as dependências no
build. O terminal e o VS Code usam esse Python automaticamente. Em cada arranque,
o backend verifica `requirements.txt`, instala alterações quando necessário,
valida as dependências e executa as migrações de `auth_db` e `default` antes de
iniciar Django. Não é necessário criar/ativar outro `.venv`, instalar Django
manualmente ou executar outro `runserver`.

Verificar e criar o administrador, apenas na primeira utilização:

```bash
python -c 'import sys; print(sys.executable)'
python -m django --version
cd backend
python manage.py createsuperuser --database=auth_db
```

O Python deve ser `/opt/venv/bin/python`. Abre a porta **8000** no painel **Ports**;
a raiz redireciona para `/admin/`. Se o VS Code tiver guardado outro intérprete,
seleciona `/opt/venv/bin/python` em **Python: Select Interpreter** e abre um novo terminal.

### Atualizar O Codespace Com Alterações Do GitHub

Guarda e faz commit das alterações locais, ou usa `git stash push -u`, antes de
atualizar. Na raiz do repositório:

```bash
git status --short
git branch --show-current
git fetch origin
git pull --ff-only
```

O pull atualiza o ramo atual: `workingEnv` recebe `origin/workingEnv`, e `master`
recebe `origin/master`. Se o PR foi integrado apenas em `master` e continuas em
`workingEnv`, integra essas alterações com `git merge origin/master`.
Se usaste stash, recupera o trabalho com `git stash pop` depois da atualização.

- Código Python: Django recarrega automaticamente.
- Migrações novas: executa `bash .devcontainer/setup-backend.sh` na raiz.
- `requirements.txt`: para e volta a iniciar o Codespace; o arranque sincroniza
  as dependências antes das migrações.
- Dockerfile, Compose, configuração do devcontainer ou `.env` da raiz:
  executa **Codespaces: Rebuild Container** depois do pull.

Esta atualização do ambiente Python e das credenciais requer um rebuild inicial.
Confirma antes que o `.env` da raiz contém as credenciais da base existente:
alterar o ficheiro não altera a password guardada no volume PostgreSQL.
Ver [operação e credenciais PostgreSQL](.devcontainer/README.md#connect-the-database-extensions).

### Instalação Manual Fora Do Codespaces

#### 1. Criar Ambiente Virtual

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Se o PowerShell bloquear scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

#### 2. Instalar Dependências

```powershell
pip install -r requirements.txt
```

O ficheiro `backend/requirements.txt` contém as dependências necessárias para correr o backend:

- Django
- Django REST Framework
- Simple JWT
- django-cors-headers
- django-environ
- dj-rest-auth
- django-allauth
- google-auth
- requests
- psycopg2-binary
- reportlab

#### 3. Migrar Base De Dados

Como o projeto usa mais do que uma base de dados, executa as migrações explicitamente:

```powershell
python manage.py migrate --database=auth_db
python manage.py migrate --database=default
```

#### 4. Criar Superutilizador

```powershell
python manage.py createsuperuser --database=auth_db
```

#### 5. Correr Backend

```powershell
python manage.py runserver 127.0.0.1:8000
```

URLs úteis:

| URL | Descrição |
|---|---|
| `http://127.0.0.1:8000/admin/` | Django Admin |
| `http://127.0.0.1:8000/api/auth/user/` | Estado de autenticação |
| `http://127.0.0.1:8000/api/reports/` | Relatórios |

## Frontend

### 1. Instalar Dependências

```powershell
cd frontend
npm ci
```

Usa `npm ci` para instalações limpas e reproduzíveis com base no `package-lock.json`.

### 2. Correr Frontend

```powershell
npm run dev
```

Abrir:

```text
http://localhost:5173
```

### 3. Build De Produção

```powershell
npm run build
npm run preview
```

## Autenticação

### Login Por Email

Fluxo:

1. O utilizador introduz o email.
2. O backend cria um código OTP.
3. O código é enviado por SMTP.
4. O utilizador introduz o código.
5. O backend cria cookies JWT HTTP-only.
6. O frontend valida a sessão em `/api/auth/user/`.

Para funcionar noutro ambiente, configura no `backend/.env`:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`

Se usares Gmail, cria uma App Password e usa essa password no `EMAIL_HOST_PASSWORD`.

### Login Com Google

Configuração necessária:

1. Criar OAuth Client no Google Cloud Console.
2. Tipo: Web application.
3. Adicionar origem autorizada:

```text
http://localhost:5173
```

4. Colocar o Client ID em:

```env
VITE_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_ID=...
```

5. Colocar o Client Secret em:

```env
GOOGLE_CLIENT_SECRET=...
```

O valor de `VITE_GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_ID` deve ser o mesmo Web Client ID.

## Exportação De Relatórios

Os formatos suportados são:

- JSON
- CSV
- PDF

Os ficheiros são gerados em memória no momento da exportação e enviados diretamente na resposta HTTP. Não são guardados no servidor nem na base de dados.

## Comandos De Validação

Backend no Codespaces, sem ativação manual:

```bash
cd backend
python manage.py check
python manage.py test
python -m pip check
```

Backend numa instalação manual:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py check
python manage.py test
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

Verificar dependências Python:

```powershell
cd backend
.\venv\Scripts\python.exe -m pip check
```

## Troubleshooting

### `POSTGRES connection refused`

Verificar se o container está ativo:

```powershell
docker ps
```

Confirmar no `backend/.env`:

```env
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
```

### `Couldn't import Django`

No Codespaces, confirma que o terminal usa `/opt/venv/bin/python`. Não atives
um `.venv` criado manualmente. Se o ambiente gerido ainda não existir, atualiza
o ramo e faz **Codespaces: Rebuild Container**. As migrações e o servidor usam
o mesmo ambiente e não precisam de uma segunda instalação de Django.

Fora do Codespaces, ativar o ambiente virtual:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
```

Instalar dependências:

```powershell
pip install -r requirements.txt
```

### Login Por Email Não Avança Para O Código

Verificar:

- backend está a correr em `http://127.0.0.1:8000`
- `frontend/.env` tem `VITE_API_BASE_URL=http://localhost:8000`
- SMTP está configurado no `backend/.env`
- consola do backend não mostra erro de envio de email

### Google Mostra `404. That's an error.`

Normalmente indica configuração errada do Google OAuth.

Verificar:

- `VITE_GOOGLE_CLIENT_ID` é um Web Client ID válido.
- origem autorizada no Google Cloud inclui `http://localhost:5173`.
- não foi usado Client ID de Android, iOS ou outro tipo.
- frontend foi reiniciado depois de alterar `frontend/.env`.

### CORS Ou Cookies Não Funcionam

Confirmar em `backend/core/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]

CORS_ALLOW_CREDENTIALS = True
```

Confirmar que o frontend chama a API com:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Setup Rápido

Os comandos abaixo destinam-se à instalação manual local. No Codespaces usa o
[arranque automático do backend](#github-codespaces-arranque-automático), sem
criar outro ambiente virtual ou iniciar um segundo servidor.

```powershell
# 1. Preparar envs
copy .env.example .env
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env

# 2. Base de dados
docker compose up -d

# 3. Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate --database=auth_db
python manage.py migrate --database=default
python manage.py runserver 127.0.0.1:8000

# 4. Frontend, noutro terminal
cd frontend
npm ci
npm run dev
```

## Notas De Segurança

- Não publicar ficheiros `.env` reais.
- Não colocar passwords SMTP, Google secrets ou `DJANGO_SECRET_KEY` no Git.
- Em produção, configurar `DEBUG=False`.
- Em produção, configurar cookies seguros (`JWT_COOKIE_SECURE=True`) e usar HTTPS.

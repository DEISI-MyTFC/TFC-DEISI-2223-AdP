# GitHub Codespaces

This configuration runs PostgreSQL 15, Django (Python 3.13) and React/Vite
(Node.js 22) inside one Codespace. It extends the root `docker-compose.yml`.
No external database, SMTP service, Google account, secrets or `.env` files are
needed. Building the images downloads container images and Python/npm packages;
container startup and app use require no external services. npm installs from
the package cache bundled in the frontend image, with networking disabled for
the install (`--offline`).

## Start

1. On GitHub, select the **workingEnv** branch.
2. Choose **Code → Codespaces → Create codespace on workingEnv**.
3. Wait for the containers to start. Open **React frontend** on port **5173**
   from the **Ports** tab if it has not opened automatically.

VS Code automatically installs Python, ESLint, Microsoft's PostgreSQL extension
(`ms-ossdata.vscode-pgsql`) and the Docker Extension Pack
(`ms-azuretools.vscode-docker`), plus SQLite by alexcvzz
(`alexcvzz.vscode-sqlite`), when creating the Codespace. For an existing
Codespace, pull the updated configuration and run **Codespaces: Rebuild Container**.

Django runs on port **8000**. The backend/editor container also provides loopback
TCP relays: `localhost:5432` reaches PostgreSQL at `bdtfc:5432`, and
`localhost:5173` reaches Vite at `frontend:5173`. Codespaces requires numeric
`forwardPorts` entries; it does not support `"host:port"` entries
([Codespaces limitations](https://containers.dev/supporting#codespaces-specific-limitations)).
The **Ports** panel is configured to show **5432**, **5173** and **8000**.
Both database migrations run automatically before Django starts. A health check
gates each dependent service, and the post-create check verifies both relays.

## Connect the database extensions

The PostgreSQL extension runs inside the backend/editor container. Use the
database service name directly when adding a connection:

| Setting | Value |
| --- | --- |
| Server/host | `bdtfc` |
| Port | `5432` |
| Database | `tfc_bd` |
| Authentication | PostgreSQL username/password |
| Username | `dev_user` |
| Password | `codespace-development-only` |
| SSL mode | Disable (the local development server uses plain TCP) |

These are the Codespaces development defaults set explicitly for both PostgreSQL
and Django in `.devcontainer/compose.yml`. The override replaces the root
Compose `env_file`, so the root `.env` is used by the manual database-only setup,
not by this Codespaces stack. Explicit container environment values also take
precedence over `backend/.env` when Django loads its settings.

PostgreSQL stores the initialized password in its data volume. Changing an
environment file or rebuilding the container does not change an existing
database role's password. A fresh database volume uses the default above;
a reused volume retains its initialized or subsequently changed password.

This connection uses the private Docker network. The extension does not need
a published host port, a browser URL or a cloud PostgreSQL account. The forwarded
5432 entry is useful for a local TCP client through VS Code Desktop or GitHub CLI
port forwarding; an HTTP/HTTPS Codespaces URL is not a PostgreSQL connection string.
After startup, `127.0.0.1:5432` also works from the editor container through the
local relay. `bdtfc:5432` remains available directly.

For an already-running Codespace whose rebuild is unavailable, the PostgreSQL
extension can use `bdtfc:5432` immediately. To add a localhost listener for the
Ports panel without rebuilding, run this in a separate terminal and leave it open:

```bash
sudo apt-get update
sudo apt-get install -y socat
socat TCP4-LISTEN:5432,bind=127.0.0.1,reuseaddr,fork TCP:bdtfc:5432
```

Then choose **Forward a Port** in the Ports panel and enter **5432**.

For SQLite, run **SQLite: Open Database** in the Command Palette and select
`backend/auth.sqlite3`. Use **SQLite: New Query** to query it outside Django admin.
The file is created by the automatic authentication migrations. The extension is
configured to use the development image's `/usr/bin/sqlite3` executable.

The frontend uses relative API URLs. Vite proxies `/api` and `/dj-rest-auth`
to `backend:8000`, so browser cookies stay on the frontend's forwarded origin.
Only this Codespace's exact frontend hostname is added to Vite's allowed hosts;
Django trusts its two forwarded origins for CSRF. Keep forwarded ports private:
the supplied credentials and debug servers are for development.

## Register and log in without SMTP

1. Open **Registe-se** and register with any valid email, such as
   `developer@example.test`.
2. In the Codespaces terminal, read the newest locally captured email:

   ```bash
   cd /workspaces/TFC-DEISI-2223-AdP
   ls -t backend/.dev-emails/
   cat backend/.dev-emails/<newest-file>.log
   ```

3. Enter the six-digit code from the HTML message in the browser.

Login also writes its code to a new file in that directory. Google login is
hidden when no client ID is configured. Email files and the local authentication
database are ignored by Git. The normal settings and email delivery are still
used outside the Codespaces configuration.

The first PostgreSQL initialization creates synthetic `demo_projects` and
`demo_tasks` tables, including a foreign key and sample rows. Use them to try
the structure explorer, report previews and CSV/JSON/PDF downloads. No project
business data is included or fetched.

## Persistence and development

PostgreSQL uses the existing `bdtfc_data` named volume. Users and saved report
definitions remain in `backend/auth.sqlite3`, as required by the app's database
router. Source code, SQLite and captured emails live in the Codespace workspace;
frontend dependencies use a separate named volume. Stopping/restarting the
Codespace preserves these; deleting the Codespace deletes its local data.
The seed SQL runs only for a new, empty PostgreSQL volume.

Django and Vite reload source edits. npm dependencies are installed offline from
the lockfile on frontend startup. After changing Python requirements, the
frontend lockfile or container configuration, run **Codespaces: Rebuild
Container** to refresh the images and their dependencies.

The default terminal is inside the backend container:

```bash
python --version
node --version
npm --version
sqlite3 --version
docker --version
docker compose version
docker ps

cd /workspaces/TFC-DEISI-2223-AdP/backend
python manage.py check
python manage.py test
python manage.py createsuperuser --database=auth_db
```

The backend development image includes Python 3.13, Node.js 22, npm, the Docker
CLI, Compose and Buildx. A post-create check verifies these tools and confirms
that the Docker engine is reachable. Docker commands and the Docker extension
use the Codespace's existing engine through its mounted socket. The entrypoint
sets up the development user's socket group, then runs Django as `vscode`.
The `docker` package installed by pip is a Python SDK; the Docker CLI is supplied
by the development image.

Frontend dependencies are shared with the backend/editor container, so these
commands also work in the default Codespaces terminal after startup:

```bash
cd /workspaces/TFC-DEISI-2223-AdP/frontend
npm run lint
npm run build
```

Use the separately forwarded port 8000 for Django's `/admin/`. Opening its root
URL redirects to `/admin/`; `runserver` still binds to an address and port.

## Admin login and CSRF

Django trusts the exact HTTP/HTTPS localhost origins for backend port 8000,
including `https://localhost:8000` used by local HTTPS forwarding. The Codespaces
settings also trust this Codespace's two generated forwarded origins. These
settings apply to admin form submissions; the React CORS configuration is
separate.

For another browser origin, configure `CSRF_TRUSTED_ORIGINS` in `backend/.env`
as a comma-separated list, preserving the other origins you use. Include the
scheme and any explicit port, for example:

```env
CSRF_TRUSTED_ORIGINS=http://localhost:5173,https://localhost:8000
```

Restart Django after changing settings or environment variables, then reload
`/admin/login/` before submitting credentials to obtain a fresh CSRF token.
Admin login still requires a valid CSRF token and a permitted origin.

## Run the same stack with local Docker

Use Docker Compose **2.24.4 or newer** (the override uses `!reset`). From the
repository root:

```bash
docker compose -f docker-compose.yml -f .devcontainer/compose.yml up --build -d
docker compose -f docker-compose.yml -f .devcontainer/compose.yml logs -f
```

The Compose services publish no host ports. To open the app locally, use
VS Code **Dev Containers: Reopen in Container**, which forwards the same ports.
From a host terminal you can validate the frontend with:

```bash
docker compose -f docker-compose.yml -f .devcontainer/compose.yml exec frontend npm run lint
docker compose -f docker-compose.yml -f .devcontainer/compose.yml exec frontend npm run build
```

The original database-only `docker compose up -d` workflow remains available
with the root `.env` file described in the main README.

## `Invalid line: DJANGO_SECRET_KEY=change-me`

Older `.env.example` files had an invisible UTF-8 byte order mark (BOM) before
the first key. Copying that file could make Django report that
`DJANGO_SECRET_KEY` was missing. The settings loader now accepts UTF-8 files
with or without a BOM, and the templates no longer include it. For an older
checkout, save `backend/.env` as UTF-8 without BOM, preserving its values.

The Codespaces configuration supplies Django settings through the backend
container environment and does not require a `.env` file or a Python virtual
environment. If you created a Codespace from a branch without this configuration,
switch to `workingEnv` (or the target branch after merging) and run
**Codespaces: Rebuild Container**. The configured backend uses Python 3.13 and
runs both migrations automatically.

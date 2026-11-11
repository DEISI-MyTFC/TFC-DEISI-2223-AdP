# GitHub Codespaces

This configuration runs PostgreSQL 15, Django (Python 3.13) and React/Vite
(Node.js 22) inside one Codespace. It extends the root `docker-compose.yml`.
No external database, SMTP service or Google account is needed. A root `.env`
is created automatically from `.devcontainer/.env.example` if missing;
an existing `.env` is preserved. Building the images downloads container images
and Python/npm packages. Normal startup with unchanged requirements and app use
require no external services. npm installs from
the package cache bundled in the frontend image, with networking disabled for
the install (`--offline`).

## Start

1. On GitHub, select the **workingEnv** branch.
2. Choose **Code → Codespaces → Create codespace on workingEnv**.
3. Wait for the containers to start. Open **React frontend** on port **5173**
   from the **Ports** tab if it has not opened automatically.
4. Open **Django backend** on port **8000** for the backoffice. Its root redirects
   to `/admin/`. Create an admin user once with
   `cd backend && python manage.py createsuperuser --database=auth_db`.

VS Code automatically installs Python, ESLint, Microsoft's PostgreSQL extension
(`ms-ossdata.vscode-pgsql`) and the Docker Extension Pack
(`ms-azuretools.vscode-docker`), plus SQLite Viewer by Florian Klampfer
(`qwtel.sqlite-viewer`), when creating the Codespace. For an existing
Codespace, pull the updated configuration and run **Codespaces: Rebuild Container**.
For this extension change alone, an existing Codespace can instead uninstall
**SQLite** (`alexcvzz.vscode-sqlite`) in the Extensions panel and install
**SQLite Viewer** (`qwtel.sqlite-viewer`) there, without rebuilding.

Django runs on port **8000**. The backend/editor container also provides loopback
TCP relays: `localhost:5432` reaches PostgreSQL at `bdtfc:5432`, and
`localhost:5173` reaches Vite at `frontend:5173`. Codespaces requires numeric
`forwardPorts` entries; it does not support `"host:port"` entries
([Codespaces limitations](https://containers.dev/supporting#codespaces-specific-limitations)).
The **Ports** panel is configured to show **5432**, **5173** and **8000**.
Both database migrations run automatically before Django starts. A health check
gates each dependent service, and the post-create check verifies both relays.

## Automatic backend setup

The backend image creates a Python 3.13 virtual environment at `/opt/venv` and
installs `backend/requirements.txt` there during the build. This is why Django
can run migrations before you open a terminal. VS Code, terminal `python`/`pip`,
health checks and the running backend all use that same environment automatically.
Do not create or activate an additional `backend/venv` or `backend/.venv` for
this Codespace; it would hide the installed packages.

Whenever the backend container starts, `.devcontainer/setup-backend.sh` checks
the requirements fingerprint, installs requirements if they changed, checks the
installed dependencies, and runs both database migrations before starting Django.
An unchanged requirements file does not trigger a package download on restart.
Changed requirements may need access to PyPI. No manual activation or
`pip install -r requirements.txt` is needed in normal Codespaces use.

Verify the environment from a new terminal:

```bash
python -c 'import sys; print(sys.executable); print(sys.prefix)'
python -m pip --version
python -m django --version
```

The executable/prefix should be under `/opt/venv`. If an existing Codespace has
a previously selected interpreter, use **Python: Select Interpreter** and choose
`/opt/venv/bin/python`, then open a new terminal. If it still shows Python 3.14 or
the managed environment is missing, the updated container has not been built.

## Update an existing Codespace

A Codespace is a Git checkout. Changes or merged PRs on GitHub do not update it
automatically. First save and commit your local changes, or stash them with
`git stash push -u`; ignored `.env` and database files are not included in a stash.
From the repository root, check the current branch and pull that branch:

```bash
cd /workspaces/TFC-DEISI-2223-AdP
git status --short
git branch --show-current
git fetch origin
git pull --ff-only
```

For a Codespace on `workingEnv`, this pulls `origin/workingEnv`; on `master`,
it pulls `origin/master`. If upstream tracking is missing, use
`git pull --ff-only origin workingEnv` (or `master` for that branch).
If a PR was merged only into `master` while your Codespace remains on
`workingEnv`, merge `origin/master` into your working branch explicitly with
`git merge origin/master`, resolve any conflicts, and commit the result.
Restore stashed work with `git stash pop` after updating. A refused fast-forward
means the branches diverged; review/merge the commits instead of resetting files.

Apply the update according to what changed:

| Change | Action after pulling |
| --- | --- |
| Backend source only | Django reloads source edits automatically. |
| New migrations | Run `bash .devcontainer/setup-backend.sh` from the repository root. |
| `backend/requirements.txt` | Stop and start the Codespace. Startup installs changed requirements before migrations and restarts Django with the new packages. |
| Dockerfile, Compose, devcontainer settings or root `.env` | Run **Codespaces: Rebuild Container** to recreate the containers with the updated image/environment. |

Applying the `/opt/venv` and `.env` configuration to an older Codespace requires
one rebuild after pulling; pulling alone cannot change the running container.
Before that rebuild, ensure the root `.env` matches the credentials of the
existing PostgreSQL volume. Rebuilding preserves the workspace and database
volume; deleting the Codespace deletes its local data.

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

The table shows the defaults in `.devcontainer/.env.example`. Both PostgreSQL
and Django now read `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` from
the **root `.env`**, so use that file's values when connecting. These credentials
are no longer hardcoded in the Compose YAML. The initialization script never
overwrites an existing `.env`, and the real file is ignored by Git.

Edit the root `.env` to customize the credentials. Quote passwords containing
`$`, `#` or spaces with single quotes so Compose reads them literally, for example
`POSTGRES_PASSWORD='a development $ password'`. `backend/.env` remains
optional for other Django settings; duplicate PostgreSQL credentials there do
not override the values supplied by Compose. Inside the Codespace, Django always
uses `bdtfc:5432`; a root `.env` value such as `POSTGRES_HOST=127.0.0.1` or a
different host `POSTGRES_PORT` belongs to the manual host-based workflow.

PostgreSQL stores the initialized password in its data volume. Changing an
environment file or rebuilding the container does not change an existing
database role's password. A fresh database volume uses the root `.env` values;
a reused volume retains its initialized or subsequently changed password.
For an existing database, keep the current credentials in `.env`. To change a
password without deleting data, first connect with the current database role:

```bash
docker exec -it bdtfc psql -U dev_user -d tfc_bd
```

In `psql`, run `\password dev_user` and enter the new password at its prompts,
then `\q`. Put the same password in the root `.env` and rebuild to apply it to
the backend environment. Substitute your existing role/database names if they
differ. Changing the role name or database name also requires corresponding
database administration; editing the file alone does not rename them.

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

For SQLite, open `backend/auth.sqlite3` from the Explorer. If another editor is
associated with the file, right-click it and choose **Open With... → SQLite Viewer**.
The file is created by the automatic authentication/API migrations. The viewer
has its own SQLite support and does not need the old `sqlite.sqlite3` setting.

[SQLite Viewer](https://marketplace.visualstudio.com/items?itemName=qwtel.sqlite-viewer)
provides a cached, read-only table browser with filtering and sorting; it does
not provide a SQL query runner. Reopen/refresh the viewer after Django writes
new data. For arbitrary SQL, the development image still includes the SQLite CLI.
From the repository root, for example:

```bash
sqlite3 -readonly -header -column backend/auth.sqlite3 "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
sqlite3 -readonly backend/auth.sqlite3 '.schema api_savedreport'
```

The frontend uses relative API URLs. Vite proxies `/api` and `/dj-rest-auth`
to `backend:8000`, so browser cookies stay on the frontend's forwarded origin.
Only this Codespace's exact frontend hostname is added to Vite's allowed hosts;
Django trusts its two forwarded origins for CSRF. Keep forwarded ports private:
the supplied credentials and debug servers are for development.

## Where models and tables live

`backend/api/models.py` defines two models. Their committed migrations are in
`backend/api/migrations/`: `0001_initial` creates `OTPChallenge`, `0003_savedreport`
creates `SavedReport`, and the remaining migrations update their fields/indexes.
`makemigrations` generates migration files from model changes; `migrate` applies
existing files to a database. Startup runs `migrate`, not `makemigrations`.

`backend/core/dbrouters.py` includes the entire `api` app in `AuthRouter.auth_apps`,
so **both API models go to SQLite**, along with the authentication/admin apps:

| Model/data | Database | Table/source |
| --- | --- | --- |
| `OTPChallenge` | `auth_db`: `backend/auth.sqlite3` | `api_otpchallenge` |
| `SavedReport` | `auth_db`: `backend/auth.sqlite3` | `api_savedreport` |
| Users, permissions, sessions, admin, sites and allauth | `auth_db`: `backend/auth.sqlite3` | Django/allauth tables, such as `auth_user` |
| Synthetic report data | `default`: PostgreSQL | `demo_projects`, `demo_tasks`, created by `.devcontainer/seed.sql` |

Both databases can contain `django_migrations`. Django can record a migration as
applied on `default` even when the router skips its table operations there, so
`migrate --database=default` reporting `OK` does not mean API/auth tables were
created in PostgreSQL. Inspect actual tables as well as migration history:

```bash
cd backend
python manage.py showmigrations api --database=auth_db
python manage.py shell -c "from django.db import connections; [print(alias, connections[alias].introspection.table_names()) for alias in connections]"
```

`SavedReport` exists in SQLite but is not registered in `backend/api/admin.py`;
only `OTPChallenge` is registered there. A model's absence from Django admin does
not mean its table is missing.

The larger business relational schema is **not included in the current `master`
or `workingEnv` checkout**: there is no corresponding set of Django models,
migrations, SQL schema or database dump. The two demo tables are synthetic
Codespaces fixtures, not that schema. The reporting code in
`backend/api/report_views.py` and `report_sql.py` reads PostgreSQL's existing
tables, columns and foreign keys through `information_schema`/`pg_catalog`;
it does not create the business tables. Restoring that model requires its
original schema/migrations and, if needed, a data dump. Creating a Codespace or
changing `.env` cannot reconstruct a missing database schema.

## Which environment file is used

The backend image contains Python and installed packages; it does not bake in
your private `.env` files. Configuration is supplied at runtime:

| File/source | Codespaces behavior |
| --- | --- |
| Root `.env` | Automatically created if missing; Compose passes its database credentials to PostgreSQL and Django. |
| `.devcontainer/compose.yml` `environment` | Explicit values take precedence over root `.env`, including the internal database host/port, Django settings module, secret and debug defaults. |
| `backend/.env` | Optional; `backend/core/settings.py` reads it if present. It fills environment values that Compose has not already supplied. |
| `backend/.env.example` | Manual setup template; it is not loaded or automatically copied in Codespaces. |

For example, `OTP_CODE_EXPIRY_MINUTES` or `CSRF_TRUSTED_ORIGINS` can be supplied
through `backend/.env` if absent from the process environment. PostgreSQL
credentials already supplied by Compose take precedence over duplicates there.
`core.codespaces_settings` also deliberately selects local file-based email
delivery, so copying the SMTP/Google placeholders from the manual template is
unnecessary. Restart Django after editing an optional backend environment file;
recreate the containers after changing root `.env` values supplied by Compose.

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

Django and Vite reload source edits. Python requirements are synchronized before
migrations at backend startup. npm dependencies are installed offline from
the lockfile on frontend startup. After changing the frontend lockfile or
container configuration, run **Codespaces: Rebuild Container** to refresh the
images and their dependencies.

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
bash .devcontainer/initialize-env.sh
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
container environment, initializes the root `.env` automatically if missing,
and manages `/opt/venv` for you. If you created a Codespace from a branch without this configuration,
switch to `workingEnv` (or the target branch after merging) and run
**Codespaces: Rebuild Container**. The configured backend uses Python 3.13 and
runs both migrations automatically.

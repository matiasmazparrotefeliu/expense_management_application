# AGENTS.md

FastAPI + SQLAlchemy (MySQL) expense-tracking API. Python 3.11, deps in `requirements.txt`. No linter, no CI.

## Change rules

- Limit every change to the scope of the requirement at hand. Do not refactor or "improve" unrelated code.
- Do not alter the architecture of the repository/application/system (structure, entrypoints, wiring, dependencies, config, Docker setup).
- Do not alter the database and/or data persistence models (`backend/src/models/*`).
- NEVER run tests/checks nor build/start/stop Docker containers — the user does all of that manually. Only prepare the changes and hand over the exact commands for them to run.
- Always use object-oriented programming (OOP) in any code written or changed.
- When implementing new functionality or refactoring existing code, add docstring-style comments (docstrings); do not add comments that add no value or meaning.
- After implementing a change, review the resulting diff for duplicated logic, redundancies and dead code, and consolidate them before considering the task done.
- Whenever changes are applied, update `AGENTS.md` accordingly.

## Run

- Setup: `python -m venv myenv` + `myenv\Scripts\activate` (Windows) + `pip install -r requirements.txt`. The `myenv` venv is gitignored.
- App (local): `uvicorn main:app --reload` — **must run from repo root** (inside `backend/`). Imports are mixed absolute (`backend.src.models`, `backend.src.db.config`) and relative (`..db.config`, `.security`), so a `src`-relative cwd will break imports.
- Docker: `docker compose up --build` runs a single `fastapi` container. SQLite DB (`DB_URL=sqlite:////app/data/expense_app.db`) persists via a **bind mount** of `backend/data/` (`./backend/data:/app/data`), not a named volume. Dev mode (`./backend:/app` + `APP_RELOAD=true` → `--reload`) comes from `docker-compose.override.yaml`, applied automatically; run prod-only with `docker compose -f docker-compose.yaml up --build`. `backend/scripts/entrypoint.py` seeds default categories, then launches uvicorn.

## DB config

`backend/src/db/config.py` prefers `DB_URL` when set (e.g. `sqlite:///./expense_app.db` or a full MySQL URL). If unset, builds `mysql+pymysql://` from `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`. SQLite engines get `connect_args={"check_same_thread": False}` automatically. `load_dotenv()` loads `.env`; `.env.example` shows both forms — `DB_URL` wins.

## SQLite notes

- No migrations — `Base.metadata.create_all(bind=engine)` runs at import time in `backend/main.py`. Edit models, restart to apply. (Alembic is in requirements but unused.)
- The SQLite file (`expense_app.db`, or `backend/data/expense_app.db` in Docker) is gitignored; delete it to reset the schema.
- Tables are auto-created, but **categories are not seeded** on local runs. Run only the `INSERT INTO categories` block in `queries.sql` (the `CREATE VIEW user_expenses` above it references a nonexistent `expenses` table — the model table is `operations`; the Docker entrypoint seeds categories automatically via `backend/scripts/entrypoint.py`). Creating an operation with a `category_id` that isn't active in the DB returns 400.

## Auth

- All authentication logic lives in the `backend/src/auth/` package: `Security` class (`security.py`), `LoadUserData` middleware (`middleware.py`), and `get_current_user` dependency (`dependencies.py`).
- The `backend/src/auth/__init__.py` uses lazy imports (no eager re-exports) to avoid triggering DB config loading at import time. Consumers must import directly from submodules: `from .security import Security`, `from .middleware import LoadUserData`, `from .dependencies import get_current_user`.
- JWT handled by `LoadUserData` middleware, not FastAPI dependencies. It decodes the `Authorization: Bearer <token>` header and sets `request.state.user` to a **dict** (`user.to_dict()`), so route/service code uses `user['id']`, not `user.id`. User accounts are eagerly loaded via `joinedload(User.accounts)` to prevent lazy-loading surprises.
- Tokens use PyJWT (`jwt`), payload is minimal: `sub` (user id) + `exp`/`iat`. `SECRET_KEY` (env `SECRET_KEY`, dev default), `ALGORITHM`, and `PasswordHash` live as module constants in `backend/src/auth/security.py` (single source of truth — do not hardcode elsewhere).
- Passwords are hashed with **argon2** via `pwdlib` (`PasswordHash.recommended()`). Rows hashed under the old passlib/bcrypt will not verify — re-register them.

## Style / structure

- Routes are registered imperatively: each route class's `__init__` calls `self.router.add_api_route(...)`; there are no decorators. New endpoints go in `backend/src/api/*_routes.py`, logic in `backend/src/services/*`. Current sets: `UserRoutes` (`/users`), `AccountRoutes` (`/accounts` — `GET /` lists own active accounts, `POST /new` creates a zero-balance account), `CategoryRoutes` (`/categories` — read-only catalog), `OperationRoutes` (`/operations`).
- Protected routes use `user: dict = Depends(get_current_user)` to enforce auth via the `LoadUserData` middleware; the dependency (`backend/src/auth/dependencies.py`) raises 401 when `request.state.user` is absent.
- Services return `JSONResponse` directly; the `response_model` on routes is effectively bypassed. The `to_dict()` on SQLAlchemy models is the de-facto serializer.
- Currency whitelist lives in `backend/src/core/currencies.py`: `SUPPORTED_CURRENCIES` (env-overridable, default `USD,ARS`) plus `validate_supported_currency()`, shared by the `AccountCreate` and `CreateOperation` schemas (422 on rejection) — never re-implement the check in a service or model.
- Service class naming is inconsistent: `User_Service` (snake case) vs `OperationService`/`AccountService`/`CategoryService` — match the existing file's convention.
- Print-based debug statements are pervasive throughout; keep them when touching code (they're part of the current workflow).
- Balance model: `User` holds no balance — money lives in `Account.balance`. Account balance is **derived from operations**: `OperationService.create_new` (in `backend/src/services/operation_service.py`) applies a signed delta (`income` → `+amount`, `expense`/`transfer` → `-amount`, both Spanish and English type strings are accepted, e.g. `transferencia`/`transfer`) to the owning account and rejects anything that would go negative. There is no manual balance endpoint.
- Operation date is always server-generated (`date` = utcnow at insert, plus `created_at` server_default) — clients never send dates.
- `Operation.name` (column in `backend/src/models/operation.py`; JSON key `name` everywhere — payload, response, DB) is an optional free-text column holding the merchant (purchase), service (payment/subscription), or person (transfer) associated with the operation — the specific meaning is inferred from `category`/`type` by the caller, not validated server-side. For `transfer` operations, `OperationService.create_new` defaults `name` to `"Other"` when the client omits it.
- Operation currency: optional on `CreateOperation` (whitelist-validated like accounts, 422). When supplied it **must match the account's currency** (400 `Currency mismatch` in the service); when omitted the account's currency is snapshotted onto the operation.
- Gotcha: account ownership is centralized in `OperationService.get_owned_account(user_id, account_id, lock=False)` — 404 when missing, 403 when foreign; `lock=True` adds `with_for_update()` and must only be used right before mutating the balance, never across slow work (e.g. AI calls). `create_new` validates under lock; `ReceiptService.create_from_receipt` pre-checks without it. `CreateOperation` carries only `account_id` + `category_id`, never a raw `user_id`.

## AI receipts (`POST /operations/from-receipt`)

- Multipart endpoint: `file` (pdf/png/jpg/jpeg/webp, ≤10 MB → 422 otherwise) + `account_id` (Form), auth required. Validation order is cheap-first: file type/size (422) → account exists/ownership (404/403) → provider config (503) → text extraction (422/503) → AI call (502) → structuring (400) → persist via `OperationService.create_new`.
- Pipeline: `ReceiptTextExtractor` (`backend/src/core/receipt_text.py`) turns the upload into plain text — PDFs via `pypdf` (**embedded text layer only**; scanned PDFs → 422), images via pytesseract OCR (`spa+eng`; missing tesseract binary → 503). `ReceiptService` (`backend/src/services/receipt_service.py`) then prompts the model for strict JSON (`concept/amount/currency/type/name/category`), mapping `category` by name against the active catalog.
- Provider: any OpenAI-compatible `/chat/completions` endpoint, called through the official **`openai` Python client** (`OpenAI(api_key=API_KEY, base_url=API_URL)`; any `openai.OpenAIError` → 502). Env vars `API_URL`, `API_KEY` (add manually to `.env`; unset → 503), `AI_MODEL` (default `deepseek-v4-flash-free`, OpenCode Zen — **text-only**, hence the server-side text extraction). Compose passes them through to the container.
- The extracted operation goes through the same rules as manual creation (balance delta, ownership, transfer → `"Other"`, currency mismatch 400).
- Deps added for this feature: `python-multipart` (required by FastAPI `UploadFile`), `pypdf`, `pytesseract`, `Pillow`, `openai`.
- `app_flow_testing.ipynb` (repo root) walks the whole flow end-to-end against the container, including an automatic-mode demo gated behind a local `RECEIPT_PATH` variable.

## Tests

- `pytest` + `httpx` in `requirements.txt`. Run from repo root: `python -m pytest tests -v` (the `python -m` form is required so the repo root lands on `sys.path` for the `backend.src.*` absolute imports).
- Tests exercise the **running Docker container** over HTTP: the `client` fixture is an `httpx.Client` pointed at `http://localhost:8000`, so `docker compose up --build` must be up first (`container_ready` fixture fails fast with that hint otherwise).
- There is no reset endpoint, so per-test isolation comes from a direct `sqlite3` connection to the shared repo-root `expense_app.db` (the same file the container writes via its `/app/data` bind mount): `truncate_tables` runs `DELETE FROM operations/accounts/users` before every test in FK order. `categories` are **not** truncated — they are seeded once by `backend/scripts/entrypoint.py`; the `category` fixture reuses the first active one (and only inserts a fallback if the catalog were empty).
- Because tests truncate the shared file, a test run wipes users/accounts/operations from the dev DB (categories persist). This is expected.
- `test_auth.py` decodes JWTs with the dev-default `SECRET_KEY`/`ALGORITHM` from `backend/src/auth/security.py` — importing that module is safe (no DB side effects); the container runs with the same default.
- `tests/test_receipt_extraction.py` is the exception to the container rule: in-process unit tests over the pure helpers of `ReceiptTextExtractor`/`ReceiptService` (validation, prompt, JSON parsing, payload mapping) with **no DB and no provider call**, so they run without a key. The container-side receipt tests (`tests/test_receipts.py`) only cover paths that fail **before** the AI call (401/422/404/403) for the same reason.
- Tests are NOT run by the agent (Change rules) — the user executes `python -m pytest tests -v` manually after every change.

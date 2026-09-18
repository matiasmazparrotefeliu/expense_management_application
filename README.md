# Expense Management Application

API REST para la gestión de gastos personales: permite a un usuario registrarse, administrar cuentas en distintas monedas y registrar operaciones de ingreso o egreso que impactan automáticamente el balance de cada cuenta.

## Menú de navegación

- [Descripción y alcance](#descripción-y-alcance)
- [Stack tecnológico](#stack-tecnológico)
- [Comandos de ejecución](#comandos-de-ejecución)
- [Módulos y estructura del proyecto](#módulos-y-estructura-del-proyecto)
- [Endpoints de la API](#endpoints-de-la-api)
- [Persistencia de datos](#persistencia-de-datos)
- [Notas adicionales](#notas-adicionales)

## Descripción y alcance

La aplicación gestiona cuatro dominios principales:

- **Usuarios y autenticación**: registro, login y emisión de tokens JWT.
- **Cuentas**: cada usuario puede tener múltiples cuentas, cada una en una moneda soportada, con balance propio.
- **Categorías**: catálogo predefinido usado para clasificar operaciones (por ejemplo, salario, alquiler, compras).
- **Operaciones**: registros de ingreso o egreso asociados a una cuenta y una categoría, que actualizan el balance de la cuenta de forma automática al crearse.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Lenguaje | Python 3.11 |
| Framework web | FastAPI (servido con Uvicorn) |
| ORM | SQLAlchemy |
| Validación de datos | Pydantic |
| Autenticación | PyJWT (tokens JWT) |
| Hash de contraseñas | pwdlib (argon2) |
| Testing | pytest + httpx |
| Contenedores | Docker / Docker Compose |

> Nota: `alembic` está listado en `requirements.txt` pero no está en uso actualmente; el esquema de base de datos se crea con `Base.metadata.create_all`.

## Comandos de ejecución

Toda la ejecución del proyecto se realiza mediante Docker.

**Levantar la aplicación (modo desarrollo, con reload automático):**

```bash
docker compose up --build
```

Este comando usa `docker-compose.yaml` junto con `docker-compose.override.yaml` (aplicado automáticamente), habilita recarga en caliente y ejecuta `scripts/entrypoint.py`, que crea el esquema de base de datos y siembra las categorías por defecto antes de iniciar Uvicorn.

**Levantar la aplicación (modo producción, sin overrides de desarrollo):**

```bash
docker compose -f docker-compose.yaml up --build
```

**Ejecutar los tests:**

```bash
python -m pytest tests -v
```

Los tests se ejecutan contra el contenedor Docker corriendo (hacen peticiones HTTP a `http://localhost:8000`), por lo que `docker compose up --build` debe estar activo antes de correrlos.

**Variables de entorno** (definidas en `.env.example`):

| Variable | Descripción |
|---|---|
| `DB_URL` | Cadena de conexión completa (tiene prioridad sobre las siguientes). Ej: `sqlite:///./expense_app.db` o `mysql+pymysql://user:pass@host:port/dbname` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Componentes usados para construir la conexión MySQL si `DB_URL` no está definido |
| `SECRET_KEY` | Clave usada para firmar los tokens JWT |
| `SUPPORTED_CURRENCIES` | Lista de monedas soportadas separadas por coma (por defecto `USD,ARS`) |

## Módulos y estructura del proyecto

```
backend/
├── main.py          # Punto de entrada: inicializa la app y registra middleware + routers
├── src/
│   ├── api/              # Definición de endpoints por dominio (users, accounts, categories, operations)
│   ├── services/         # Lógica de negocio de cada dominio
│   ├── models/            # Modelos SQLAlchemy (entidades de base de datos)
│   ├── schemas/           # Modelos Pydantic de entrada/salida (request/response)
│   ├── core/               # Seguridad (JWT, hash de contraseñas) y monedas soportadas
│   ├── db/                  # Configuración de conexión y sesión de base de datos
│   ├── auth/                # Autenticación (Security, LoadUserData, get_current_user)
│   ├── enums/                # Enumeraciones compartidas (tipo de operación)
│   └── middlewares/           # Middleware de autenticación (ya integrado en src/auth/)
└── scripts/
    └── entrypoint.py     # Seed de categorías + lanzamiento de uvicorn
```

Los cuatro módulos funcionales expuestos por la API son: **users** (usuarios y autenticación), **accounts** (cuentas), **categories** (categorías) y **operations** (operaciones de ingreso/egreso).

## Endpoints de la API

### Users / Auth (`/users`)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/users/` | No | Lista todos los usuarios activos, con sus cuentas |
| GET | `/users/{id}` | No | Obtiene un usuario activo por id |
| POST | `/users/new` | No | Registra un usuario nuevo (`name`, `email`, `password`) |
| POST | `/users/login` | No | Login (`email`, `password`); devuelve `access_token` y `token_type` |

### Accounts (`/accounts`)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/accounts/` | Sí | Lista las cuentas activas del usuario autenticado |
| POST | `/accounts/new` | Sí | Crea una cuenta nueva (`name`, `currency`) con balance inicial en 0 |

### Categories (`/categories`)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/categories/` | No | Lista el catálogo de categorías activas |

### Operations (`/operations`)

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/operations/` | Sí | Lista todas las operaciones de las cuentas del usuario autenticado |
| GET | `/operations/{id}` | Sí | Obtiene una operación por id, dentro de las cuentas del usuario |
| POST | `/operations/new` | Sí | Crea una operación (`concept`, `amount`, `type`, `account_id`, `category_id`) y actualiza el balance de la cuenta |

`type` acepta `income`/`expense` (o sus equivalentes en español `ingreso`/`egreso`).

### Root

| Método | Path | Auth | Descripción |
|---|---|---|---|
| GET | `/` | No | Endpoint de estado, devuelve `{"Hello": "World"}` |

La autenticación se realiza mediante un header `Authorization: Bearer <token>`, validado por un middleware global que carga el usuario autenticado en cada request.

## Persistencia de datos

El motor de base de datos por defecto es **SQLite**, persistido mediante un bind mount del directorio `backend/data/` en el contenedor Docker (`DB_URL=sqlite:////app/data/expense_app.db`). También es posible conectarse a **MySQL** configurando `DB_URL` o las variables `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`.

El esquema se crea automáticamente mediante `Base.metadata.create_all` al iniciar la aplicación. Las categorías por defecto se siembran automáticamente al levantar el contenedor Docker, a través de `backend/scripts/entrypoint.py`.

### Modelos y relaciones

- **User**: usuario del sistema (`name`, `email`, `password`, `is_active`). No almacena balance directamente.
- **Account**: cuenta perteneciente a un usuario (`name`, `currency`, `balance`, `is_active`). Un usuario puede tener múltiples cuentas.
- **Category**: catálogo de categorías (`name`, `description`, `is_active`) usado para clasificar operaciones.
- **Operation**: registro de ingreso o egreso (`concept`, `amount`, `type`, `currency`, `date`), asociado a una cuenta y una categoría.

**Relaciones**: `User` (1) → `Account` (N) → `Operation` (N) → `Category` (1).

## Notas adicionales

Para reglas de contribución, convenciones de código y detalles internos de implementación (autenticación, manejo de balances, estructura de rutas), consultar [`AGENTS.md`](AGENTS.md).

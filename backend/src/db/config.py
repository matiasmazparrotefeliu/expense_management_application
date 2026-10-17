"""Database engine and session configuration, differentiated per environment.

`APP_ENV` selects the behaviour: `dev` (default) keeps the local SQLite database
(URL from `DB_URL`, or the legacy `DB_*` MySQL build when unset), while `prod`
requires a PostgreSQL connection string (`DATABASE_URL`, or `DB_URL` which takes
priority) and refuses to start on SQLite. The URL is always normalized to the
`psycopg2` driver so Render's `postgres://` submission is accepted by SQLAlchemy 2.0.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv('APP_ENV', 'dev').strip().lower()
IS_PRODUCTION = APP_ENV == 'prod'


def normalize_db_url(url: str) -> str:
    """Force the `psycopg2` driver on PostgreSQL URLs.

    Render may hand back `postgres://` (rejected outright by SQLAlchemy 2.0) or a
    bare `postgresql://` (which defaults to psycopg2 anyway); both are rewritten to
    `postgresql+psycopg2://` so the installed driver is always used explicitly."""
    if url.startswith('postgres://'):
        return url.replace('postgres://', 'postgresql+psycopg2://', 1)
    if url.startswith('postgresql://'):
        return url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    return url


def resolve_db_url() -> str:
    """Resolve the database URL for the current environment.

    Priority is `DB_URL` -> `DATABASE_URL` (Render's standard name). In production a
    missing URL is a hard error so the app never silently falls back to an ephemeral
    database; in development the legacy `DB_*` MySQL build is kept for backwards
    compatibility."""
    url = os.getenv('DB_URL') or os.getenv('DATABASE_URL')
    if url:
        return normalize_db_url(url)
    if IS_PRODUCTION:
        raise RuntimeError(
            "APP_ENV=prod requires DATABASE_URL (the PostgreSQL connection string)."
        )
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_host = os.getenv('DB_HOST')
    db_port = os.getenv('DB_PORT')
    db_name = os.getenv('DB_NAME')
    return f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{int(db_port)}/{db_name}"


db_url = resolve_db_url()

if IS_PRODUCTION and db_url.startswith('sqlite'):
    raise RuntimeError(
        "APP_ENV=prod cannot run on SQLite: set DATABASE_URL to your PostgreSQL database."
    )

connect_args = {}
engine_kwargs = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif db_url.startswith("postgresql"):
    # Render's free PostgreSQL drops idle connections: pre-ping and recycle keep
    # pooled connections healthy. SSL is only needed for the external URL.
    engine_kwargs = {"pool_pre_ping": True, "pool_recycle": 300}
    sslmode = os.getenv('DB_SSL_MODE')
    if sslmode:
        connect_args = {"sslmode": sslmode}

engine = create_engine(db_url, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

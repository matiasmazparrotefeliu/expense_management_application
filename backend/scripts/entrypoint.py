import os

import uvicorn

from src.db.config import Base, engine, SessionLocal
from src.models import Category

DEFAULT_CATEGORIES = [
    ("supermercado", "Compras de alimentos y artículos de primera necesidad"),
    ("transferencias", "Envíos o recepciones de dinero entre cuentas o personas"),
    ("servicios/suscripciones", "Pagos de servicios (luz, gas, internet, teléfono) y suscripciones"),
    ("sueldo", "Cobro de salarios"),
    ("expensas", "Expensas del edificio/consorcio donde se vive"),
    ("alquiler", "Pago de alquiler de vivienda"),
    ("viajes", "Transporte, hospedaje y gastos de viajes"),
    ("otros", "Gastos varios que no encajan en ninguna otra categoría"),
]


def seed_categories():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            db.add_all([Category(name=name, description=description) for name, description in DEFAULT_CATEGORIES])
            db.commit()
            print("Seeded default categories")
        else:
            print("Categories already present, skipping seed")
    finally:
        db.close()


def main():
    seed_categories()
    reload_app = os.getenv("APP_RELOAD", "").lower() in ("1", "true", "yes")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=reload_app,
    )


if __name__ == "__main__":
    main()

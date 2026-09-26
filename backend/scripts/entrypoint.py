import os

import uvicorn

from src.db.config import Base, engine, SessionLocal
from src.models import Category
from src.enums import OperationType

DEFAULT_CATEGORIES = [
    # --- EGRESOS (EXPENSE) ---
    {
        "name": "Supermercado",
        "type": OperationType.expense,
        "description": "Compras de alimentos, limpieza y artículos de primera necesidad",
    },
    {
        "name": "Servicios",
        "type": OperationType.expense,
        "description": "Pagos de servicios básicos del hogar (luz, gas, agua, internet, telefonía)",
    },
    {
        "name": "Suscripciones",
        "type": OperationType.expense,
        "description": "Servicios de streaming, plataformas digitales y membresías periódicas",
    },
    {
        "name": "Expensas",
        "type": OperationType.expense,
        "description": "Gastos comunes y de mantenimiento del edificio o consorcio",
    },
    {
        "name": "Alquiler",
        "type": OperationType.expense,
        "description": "Pago mensual del alquiler de la vivienda o inmueble",
    },
    {
        "name": "Viajes",
        "type": OperationType.expense,
        "description": "Gastos de transporte, pasajes, hospedaje y turismo",
    },
    {
        "name": "Otros Gastos",
        "type": OperationType.expense,
        "description": "Gastos varios o eventuales que no encajan en otra categoría",
    },

    # --- INGRESOS (INCOME) ---
    {
        "name": "Sueldo",
        "type": OperationType.income,
        "description": "Cobro de salarios, honorarios o ingresos laborales principales",
    },
    {
        "name": "Otros Ingresos",
        "type": OperationType.income,
        "description": "Ingresos extraordinarios, cobros varios o rendimientos",
    },

    # --- TRANSFERENCIAS (TRANSFER) ---
    {
        "name": "Transferencias",
        "type": OperationType.transfer,
        "description": "Envíos de dinero a personas o cuentas externas",
    },
]


def seed_categories():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            db.add_all([
                Category(name=entry["name"], type=entry["type"], description=entry["description"])
                for entry in DEFAULT_CATEGORIES
            ])
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

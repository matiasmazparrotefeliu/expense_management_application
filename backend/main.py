import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.db.config import Base, engine
from src.models import User, Account, Operation, Category
from src.api import UserRoutes, AccountRoutes, CategoryRoutes, OperationRoutes
from src.auth.middleware import LoadUserData

app = FastAPI()
Base.metadata.create_all(bind=engine)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS_ORIGINS = list(dict.fromkeys([FRONTEND_URL, "http://localhost:3000", "http://frontend:3000"]))

app.add_middleware(LoadUserData)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

user_routes = UserRoutes().router
account_routes = AccountRoutes().router
category_routes = CategoryRoutes().router
operations_router = OperationRoutes().router
app.include_router(user_routes)
app.include_router(account_routes)
app.include_router(category_routes)
app.include_router(operations_router)

@app.get("/")
def read_root():
    print("----------------------------")
    return {"Hello": "World"}
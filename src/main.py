from fastapi import FastAPI
from .db.config import Base, engine
from .models import User, Account, Operation, Category
from .api import UserRoutes, AccountRoutes, CategoryRoutes, OperationRoutes
from .auth.middleware import LoadUserData

app = FastAPI()
Base.metadata.create_all(bind=engine)

app.add_middleware(LoadUserData)

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
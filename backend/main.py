from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
import os

from routers import auth, obat, transaction, calendar, users

app = FastAPI(title="Motara API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key="super-secret-motara-key")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "profiles")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "uploads")), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(obat.router, prefix="/api/obat", tags=["Obat"])
app.include_router(transaction.router, prefix="/api/transaction", tags=["Transaction"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])

@app.get("/")
def read_root():
    return {"message": "Motara API is running!"}

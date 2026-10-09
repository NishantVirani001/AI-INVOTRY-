from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
import backend.models.core as models

# Import modular routers
from backend.routers import auth, products, categories, suppliers, orders, purchases, dashboard, ai, customers, notifications, reports

import threading
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Non-blocking warm-up of the database connection pool
    def _warmup():
        try:
            from sqlalchemy import text
            Base.metadata.create_all(bind=engine)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception:
            pass
    threading.Thread(target=_warmup, daemon=True).start()
    yield

app = FastAPI(
    title="StockPilot API",
    description="Enterprise AI-Powered Inventory & Supply Chain Management REST API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for local React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(suppliers.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(purchases.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(notifications.router)
app.include_router(reports.router)


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "service": "StockPilot API",
        "version": "1.0.0",
        "docs": "/docs",
    }

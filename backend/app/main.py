"""API de detección de enfermedades en plantas (FastAPI)."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, auth, historial, prediccion, salud
from app.services.modelo import cargar_modelo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Si el hash no coincide, cargar_modelo() lanza una excepción y el servidor NO arranca.
    cargar_modelo()
    yield


app = FastAPI(
    title="API · Detección de Enfermedades en Plantas",
    description="Diagnóstico de hojas con MobileNetV2 (15 clases), verificación SHA-256 del modelo y autenticación JWT.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_lista,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def cabeceras_seguridad(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    resp.headers["Cache-Control"] = "no-store"
    return resp


app.include_router(salud.router)
app.include_router(prediccion.router)
app.include_router(historial.router)
app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/", include_in_schema=False)
def raiz():
    return {"servicio": "detección de enfermedades en plantas", "docs": "/docs", "salud": "/health"}

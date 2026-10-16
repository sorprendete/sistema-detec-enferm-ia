"""Datos de red de la petición (IP real del cliente y navegador)."""
from fastapi import Request


def ip_cliente(request: Request) -> str:
    # Azure Container Apps (Envoy) añade la IP real al FINAL de X-Forwarded-For.
    # Se toma la última para que un cliente no pueda falsificarla enviando la cabecera.
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[-1].strip()[:64]
    return request.client.host if request.client else "desconocida"


def agente(request: Request) -> str:
    return request.headers.get("user-agent", "")[:300]

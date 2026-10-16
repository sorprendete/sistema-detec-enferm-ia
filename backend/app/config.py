"""Configuración central leída desde variables de entorno (.env en local, variables de entorno en Azure Container Apps)."""
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    # Archivos del modelo
    modelo_path: Path = BASE_DIR / "modelo" / "modelo_plantas.keras"
    clases_path: Path = BASE_DIR / "modelo" / "clases.json"
    hash_path: Path = BASE_DIR / "modelo" / "modelo_hash.txt"
    filtro_path: Path = BASE_DIR / "modelo" / "filtro_cultivos.keras"
    filtro_hash_path: Path = BASE_DIR / "modelo" / "filtro_hash.txt"

    # Supabase (autenticación y base de datos)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    # Solo para proyectos con "Legacy JWT secret" (HS256). Si se deja vacío
    # se usan las claves públicas JWKS del proyecto (recomendado).
    supabase_jwt_secret: str = ""
    # Clave secreta de servicio (service_role). Solo la usa el backend para escribir
    # el registro de auditoría y para que el administrador active o desactive cuentas.
    # NUNCA va en el frontend.
    supabase_service_role_key: str = ""

    # Seguridad de la API
    cors_origins: str = "http://localhost:5173"  # separados por coma
    max_image_mb: float = 5.0
    max_image_pixels: int = 25_000_000  # evita "bombas de descompresión"
    rate_limit_por_minuto: int = 20
    # Bloqueo por fuerza bruta: N intentos fallidos de un mismo correo en la ventana
    login_max_fallos: int = 5
    login_bloqueo_minutos: int = 15

    # Inferencia
    umbral_confianza: float = 0.75  # por debajo no se emite diagnóstico (resultado no concluyente)
    imagen_tam: int = 224
    # Filtro de cultivo: probabilidad mínima de que sea pimiento, papa o tomate
    umbral_filtro: float = 0.70

    @field_validator("supabase_url")
    @classmethod
    def _limpiar_url(cls, v: str) -> str:
        # Acepta la URL aunque se copie con /rest/v1/ o una barra final
        v = v.strip().rstrip("/")
        for sufijo in ("/rest/v1", "/auth/v1"):
            if v.endswith(sufijo):
                v = v[: -len(sufijo)]
        return v

    @property
    def cabeceras_servicio(self) -> dict:
        k = self.supabase_service_role_key
        # Las claves nuevas (sb_secret_...) van solo en "apikey"; la clave service_role
        # clásica es un JWT y también se envía como Authorization.
        if k.startswith("sb_secret_"):
            return {"apikey": k}
        return {"apikey": k, "Authorization": f"Bearer {k}"}

    @property
    def cors_lista(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

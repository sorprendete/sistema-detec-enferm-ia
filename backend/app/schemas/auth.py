import re

from pydantic import BaseModel, Field, field_validator

_EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$")
# Misma política que el formulario de registro
_REGLAS = [(r".{8,}", "8 caracteres"), (r"[A-Z]", "una mayúscula"), (r"[a-z]", "una minúscula"),
           (r"\d", "un número"), (r"[^A-Za-z0-9]", "un símbolo")]


def _email(v: str) -> str:
    v = v.strip().lower()
    if len(v) > 254 or not _EMAIL.match(v):
        raise ValueError("Correo electrónico no válido")
    return v


class Credenciales(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)

    _v_email = field_validator("email")(_email)


class NuevoUsuario(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: str
    password: str = Field(max_length=128)

    _v_email = field_validator("email")(_email)

    @field_validator("password")
    @classmethod
    def _politica(cls, v: str) -> str:
        faltan = [txt for patron, txt in _REGLAS if not re.search(patron, v)]
        if faltan:
            raise ValueError("La contraseña necesita: " + ", ".join(faltan))
        return v


class Sesion(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


class RespuestaRegistro(BaseModel):
    confirmar_correo: bool
    sesion: Sesion | None = None


class CambioEstado(BaseModel):
    activo: bool

"""Tráfico de auditoría simulado para probar la detección de amenazas.

Genera eventos con el mismo formato que la tabla public.auditoria: una semana de uso
normal (agricultores que inician sesión y analizan hojas de día) y cinco ataques:

  1. Fuerza bruta: muchas contraseñas contra una sola cuenta, de madrugada.
  2. Prueba de contraseñas en muchas cuentas (password spraying) con un script.
  3. Sondeo del modelo: cientos de imágenes que no son hojas para buscarle fallos.
  4. Creación masiva de cuentas desde una misma IP.
  5. Uso sospechoso SIN reglas que lo detecten: una IP que entra con éxito a 4 cuentas
     distintas a las 3 de la mañana. Ninguna regla salta (no hay fallos, son menos de
     5 cuentas), pero el modelo lo marca como anómalo.

No escribe nada en la base de datos: sirve para la demostración y para las pruebas.
"""
import random
from datetime import datetime, timedelta, timezone

NAVEGADORES = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; moto g54) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
]
CLASES = ["Potato___Late_blight", "Potato___healthy", "Tomato_Early_blight", "Tomato_healthy",
          "Pepper__bell___Bacterial_spot", "Tomato_Late_blight"]
LIMA = timezone(timedelta(hours=-5))

# IPs de los ataques (rangos de documentación / ejemplo)
IP_FUERZA_BRUTA = "45.161.20.14"
IP_SPRAYING = "191.98.140.7"
IP_SONDEO = "200.37.15.92"
IP_REGISTROS = "179.6.44.201"
IP_CUENTAS_COMPARTIDAS = "38.25.110.63"


def generar(dias: int = 7, usuarios: int = 40, semilla: int = 7, fin: datetime | None = None) -> list[dict]:
    r = random.Random(semilla)
    fin = fin or datetime.now(timezone.utc)
    inicio = fin - timedelta(days=dias)
    eventos: list[dict] = []

    def ev(t, accion, estado, ip, agente, email=None, detalle=None):
        eventos.append({"fecha": t.astimezone(timezone.utc).isoformat(), "accion": accion, "estado": estado,
                        "email": email, "ip": ip, "agente": agente, "detalle": detalle})

    def resultado(t, ip, ua, email):
        if r.random() < 0.12:
            ev(t, "predict", "fallo", ip, ua, email, "Imagen rechazada: es de otra planta (p_cultivo=0.21).")
        else:
            ev(t, "predict", "exito", ip, ua, email, f"Resultado: {r.choice(CLASES)} ({r.uniform(0.76, 0.99):.2f}, exigencia 75%).")

    # ---- Uso normal ----
    for n in range(usuarios):
        email = f"agricultor{n + 1}@correo.pe"
        ip = f"181.{r.randint(64, 67)}.{r.randint(0, 255)}.{r.randint(1, 254)}"
        ua = r.choice(NAVEGADORES)
        for _ in range(r.randint(1, 4)):  # sesiones en la semana
            dia = inicio + timedelta(days=r.uniform(0, dias - 0.3))
            t = dia.astimezone(LIMA).replace(hour=r.randint(6, 21), minute=r.randint(0, 59))
            if r.random() < 0.15:  # se equivoca una vez al escribir la contraseña
                ev(t, "login", "fallo", ip, ua, email, "Correo o contraseña incorrectos.")
                t += timedelta(seconds=r.randint(10, 40))
            ev(t, "login", "exito", ip, ua, email, "Inicio de sesión correcto.")
            for _ in range(r.randint(1, 6)):
                t += timedelta(seconds=r.randint(40, 400))
                resultado(t, ip, ua, email)
            if r.random() < 0.5:
                ev(t + timedelta(minutes=2), "logout", "exito", ip, ua, email)

    madrugada = (fin - timedelta(days=2)).astimezone(LIMA).replace(hour=3, minute=12, second=0)

    # ---- 1. Fuerza bruta contra una cuenta ----
    ua = NAVEGADORES[0]
    t = madrugada
    for i in range(40):
        t += timedelta(seconds=r.randint(2, 9))
        if i < 5:
            ev(t, "login", "fallo", IP_FUERZA_BRUTA, ua, "agricultor3@correo.pe", "Correo o contraseña incorrectos.")
        else:
            ev(t, "login", "bloqueado", IP_FUERZA_BRUTA, ua, "agricultor3@correo.pe",
               "Cuenta bloqueada temporalmente por intentos fallidos.")

    # ---- 2. Prueba de contraseñas en muchas cuentas, con un script ----
    t = (fin - timedelta(days=4)).astimezone(LIMA).replace(hour=14, minute=5)
    for n in range(28):
        for _ in range(2):
            t += timedelta(seconds=r.randint(1, 3))
            ev(t, "login", "fallo", IP_SPRAYING, "python-requests/2.32.3", f"agricultor{n + 1}@correo.pe",
               "Correo o contraseña incorrectos.")

    # ---- 3. Sondeo del modelo con imágenes que no son hojas ----
    ua = NAVEGADORES[1]
    t = (fin - timedelta(days=1)).astimezone(LIMA).replace(hour=16, minute=40)
    ev(t, "login", "exito", IP_SONDEO, ua, "pruebas.modelo@correo.pe", "Inicio de sesión correcto.")
    for _ in range(60):
        t += timedelta(seconds=r.randint(3, 8))
        if r.random() < 0.85:
            ev(t, "predict", "fallo", IP_SONDEO, ua, "pruebas.modelo@correo.pe",
               "Imagen rechazada: no parece ser una hoja (p_cultivo=0.03).")
        else:
            resultado(t, IP_SONDEO, ua, "pruebas.modelo@correo.pe")

    # ---- 4. Creación masiva de cuentas ----
    ua = NAVEGADORES[4]
    t = (fin - timedelta(days=3)).astimezone(LIMA).replace(hour=11, minute=20)
    for n in range(6):
        t += timedelta(seconds=r.randint(30, 90))
        ev(t, "registro", "exito", IP_REGISTROS, ua, f"cuenta.temporal{n}@correo-falso.xyz", "Cuenta creada.")

    # ---- 5. Una IP que entra a 4 cuentas distintas de madrugada (ninguna regla lo detecta) ----
    ua = NAVEGADORES[3]
    t = (fin - timedelta(days=1)).astimezone(LIMA).replace(hour=3, minute=2)
    for n in (5, 12, 19, 27):
        t += timedelta(minutes=r.randint(3, 9))
        email = f"agricultor{n}@correo.pe"
        ev(t, "login", "exito", IP_CUENTAS_COMPARTIDAS, ua, email, "Inicio de sesión correcto.")
        t += timedelta(minutes=1)
        resultado(t, IP_CUENTAS_COMPARTIDAS, ua, email)

    eventos.sort(key=lambda e: e["fecha"])
    return eventos

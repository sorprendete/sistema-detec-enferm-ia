"""Detección de amenazas en el registro de auditoría con Machine Learning.

Combina dos enfoques, como en las sesiones de ciberseguridad del curso:

  1. Reglas con umbral (lo clásico): "más de 5 contraseñas fallidas desde una IP = fuerza bruta".
  2. Isolation Forest (aprendizaje NO supervisado): aprende cómo se comporta una IP normal
     a partir de la propia auditoría y marca las que se salen del patrón, aunque ninguna
     regla las describa (por ejemplo, una IP que entra a 4 cuentas distintas de madrugada).

No necesita ejemplos de ataques ni etiquetas, y se entrena en milisegundos cada vez que se
ejecuta el análisis, así que siempre usa los datos más recientes y no guarda ningún archivo.

Solo depende de numpy y scikit-learn: lo usan el backend (/admin/amenazas) y el script
seguridad/analizar_auditoria.py.
"""
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

HORA_LOCAL = timezone(timedelta(hours=-5))  # Perú
MIN_IPS_ML = 10  # con menos IPs no hay suficiente "normalidad" para aprender
# Puntaje de anomalía (0-100) desde el que una IP se marca. Isolation Forest da ~50 a lo
# que no se distingue del resto; por encima de 55 la IP ya está claramente aislada.
UMBRAL_PUNTAJE = 55

# Clientes que no son un navegador: scripts, herramientas de línea de comandos, bots
AGENTE_AUTOMATIZADO = re.compile(r"curl|wget|python|requests|httpx|aiohttp|scrapy|go-http|java/|okhttp|postman|bot|spider", re.I)

# Umbrales de las reglas (se pueden cambiar desde el script con --umbral)
UMBRALES = {
    "fuerza_bruta": 5,       # contraseñas fallidas desde una IP
    "correos_distintos": 5,  # cuentas distintas probadas desde una IP
    "rechazos": 10,          # imágenes rechazadas por el filtro
    "por_minuto": 20,        # eventos en un mismo minuto
    "registros": 3,          # cuentas creadas desde una IP
}

# (clave, descripción para el informe, ¿se usa en el modelo?, transformación)
CARACTERISTICAS = [
    ("eventos", "eventos", True, "log"),
    ("fallos_login", "contraseñas fallidas", True, "log"),
    ("tasa_fallo_login", "proporción de logins fallidos", True, "tasa"),
    ("correos_distintos", "cuentas distintas usadas", True, "log"),
    ("bloqueos", "bloqueos", True, "log"),
    ("rechazos", "imágenes rechazadas", True, "log"),
    ("tasa_rechazo", "proporción de imágenes rechazadas", True, "tasa"),
    ("max_por_minuto", "eventos en un mismo minuto", True, "log"),
    ("frac_nocturna", "actividad de madrugada (0 a 5 h)", True, "tasa"),
    ("automatizado", "cliente automatizado (no es un navegador)", True, "tasa"),
    ("registros", "cuentas creadas", True, "log"),
]


def _fecha(valor) -> datetime:
    if isinstance(valor, datetime):
        return valor if valor.tzinfo else valor.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))


def caracteristicas_por_ip(eventos: list[dict]) -> dict[str, dict]:
    """Resume la auditoría en un vector de números por IP (la entrada del modelo)."""
    grupos: dict[str, list[dict]] = defaultdict(list)
    for e in eventos:
        grupos[e.get("ip") or "desconocida"].append(e)

    resultado = {}
    for ip, evs in grupos.items():
        logins = [e for e in evs if e["accion"] == "login"]
        predicts = [e for e in evs if e["accion"] == "predict"]
        fallos = sum(e["estado"] in ("fallo", "bloqueado") for e in logins)  # bloqueado = intento rechazado
        rechazos = sum(e["estado"] == "fallo" for e in predicts)
        fechas = [_fecha(e["fecha"]) for e in evs]
        por_minuto = Counter(f.strftime("%Y%m%d%H%M") for f in fechas)
        nocturnos = sum(f.astimezone(HORA_LOCAL).hour < 5 for f in fechas)
        agentes = [e.get("agente") or "" for e in evs]
        resultado[ip] = {
            "eventos": len(evs),
            "fallos_login": fallos,
            "tasa_fallo_login": fallos / len(logins) if logins else 0.0,
            "correos_distintos": len({(e.get("email") or "").lower() for e in logins if e.get("email")}),
            "bloqueos": sum(e["estado"] == "bloqueado" for e in evs),
            "rechazos": rechazos,
            "tasa_rechazo": rechazos / len(predicts) if predicts else 0.0,
            "max_por_minuto": max(por_minuto.values()),
            "frac_nocturna": nocturnos / len(evs),
            "automatizado": float(any(not a or AGENTE_AUTOMATIZADO.search(a) for a in agentes)),
            "registros": sum(e["accion"] == "registro" and e["estado"] == "exito" for e in evs),
            "primer_evento": min(fechas).isoformat(),
            "ultimo_evento": max(fechas).isoformat(),
            "correos": sorted({e["email"] for e in logins if e.get("email")})[:5],
        }
    return resultado


def reglas(c: dict, u: dict = UMBRALES) -> list[dict]:
    """Detección clásica por umbral. Devuelve las reglas que la IP incumple."""
    hallazgos = []
    if c["fallos_login"] >= u["fuerza_bruta"]:
        hallazgos.append({"tipo": "Fuerza bruta", "grave": True,
                          "detalle": f"{c['fallos_login']} contraseñas fallidas"})
    if c["correos_distintos"] >= u["correos_distintos"] and c["tasa_fallo_login"] >= 0.5:
        hallazgos.append({"tipo": "Prueba de contraseñas en muchas cuentas", "grave": True,
                          "detalle": f"{c['correos_distintos']} cuentas distintas, "
                                     f"{c['tasa_fallo_login']:.0%} de fallos"})
    if c["rechazos"] >= u["rechazos"] and c["tasa_rechazo"] >= 0.5:
        hallazgos.append({"tipo": "Sondeo del modelo", "grave": False,
                          "detalle": f"{c['rechazos']} imágenes rechazadas ({c['tasa_rechazo']:.0%})"})
    if c["max_por_minuto"] >= u["por_minuto"]:
        hallazgos.append({"tipo": "Ráfaga de peticiones", "grave": False,
                          "detalle": f"{c['max_por_minuto']} eventos en un minuto"})
    if c["registros"] >= u["registros"]:
        hallazgos.append({"tipo": "Creación masiva de cuentas", "grave": False,
                          "detalle": f"{c['registros']} cuentas creadas"})
    if c["automatizado"]:
        hallazgos.append({"tipo": "Cliente automatizado", "grave": False,
                          "detalle": "usa un script o herramienta, no un navegador"})
    return hallazgos


def _matriz(datos: list[dict]) -> np.ndarray:
    columnas = []
    for clave, _, usar, tipo in CARACTERISTICAS:
        if usar:
            v = np.array([d[clave] for d in datos], dtype=float)
            columnas.append(np.log1p(v) if tipo == "log" else v)
    return np.column_stack(columnas)


def _explicar(c: dict, medianas: dict, z: dict) -> list[str]:
    """Las 2 características en que la IP más se aleja de lo normal, en palabras."""
    textos = []
    ordenadas = sorted(CARACTERISTICAS, key=lambda t: -z.get(t[0], 0))
    for n, (clave, desc, _, tipo) in enumerate(ordenadas[:2]):
        if n and z.get(clave, 0) < 1.5:  # la primera siempre se explica
            continue
        if tipo == "tasa":
            textos.append(f"{desc}: {c[clave]:.0%} (lo normal: {medianas[clave]:.0%})")
        else:
            textos.append(f"{desc}: {c[clave]:g} (lo normal: {medianas[clave]:g})")
    return textos[:2]


def analizar(eventos: list[dict], umbrales: dict = UMBRALES, semilla: int = 0) -> dict:
    """Analiza la auditoría completa y devuelve un informe por IP, de la más sospechosa a la menos."""
    por_ip = caracteristicas_por_ip(eventos)
    ips = list(por_ip)
    datos = [por_ip[ip] for ip in ips]

    usar_ml = len(ips) >= MIN_IPS_ML
    puntajes = np.zeros(len(ips))
    anomalas = np.zeros(len(ips), dtype=bool)
    if usar_ml:
        X = StandardScaler().fit_transform(_matriz(datos))
        modelo = IsolationForest(n_estimators=300, contamination="auto", random_state=semilla)
        modelo.fit(X)
        # score_samples: cerca de -0.5 es normal; cuanto más negativo, más aislada está la IP.
        # Se expresa de 0 a 100: por encima de 50 el modelo la considera anómala.
        puntajes = -modelo.score_samples(X) * 100
        anomalas = puntajes >= UMBRAL_PUNTAJE

    # Referencia de "lo normal" para explicar cada anomalía: mediana y desviación robusta (MAD),
    # medidas en la misma escala que ve el modelo
    medianas, z_por_ip = {}, [dict() for _ in ips]
    for clave, _, _, tipo in (CARACTERISTICAS if datos else []):
        v = np.array([d[clave] for d in datos], dtype=float)
        medianas[clave] = round(float(np.median(v)), 2) if len(v) else 0.0
        t = np.log1p(v) if tipo == "log" else v
        med = float(np.median(t)) if len(t) else 0.0
        escala = float(np.median(np.abs(t - med))) * 1.4826 or (0.35 if tipo == "log" else 0.1)
        for i, x in enumerate(t):
            z_por_ip[i][clave] = (x - med) / escala

    informe = []
    for i, ip in enumerate(ips):
        c = datos[i]
        hallazgos = reglas(c, umbrales)
        anomala = bool(anomalas[i])
        if hallazgos and (anomala or any(h["grave"] for h in hallazgos)):
            nivel = "alto"
        elif hallazgos or anomala:
            nivel = "medio"
        else:
            nivel = "normal"
        informe.append({
            "ip": ip,
            "nivel": nivel,
            "puntaje": round(float(puntajes[i]), 1),
            "anomalia_ml": anomala,
            "solo_ml": anomala and not hallazgos,  # lo detectó el modelo y ninguna regla
            "reglas": hallazgos,
            "explicacion": _explicar(c, medianas, z_por_ip[i]) if anomala else [],
            "caracteristicas": {k: (round(v, 3) if isinstance(v, float) else v) for k, v in c.items()},
        })

    orden = {"alto": 0, "medio": 1, "normal": 2}
    informe.sort(key=lambda r: (orden[r["nivel"]], -r["puntaje"]))
    tipos = Counter(h["tipo"] for r in informe for h in r["reglas"])
    if any(r["solo_ml"] for r in informe):
        tipos["Comportamiento anómalo (solo ML)"] = sum(r["solo_ml"] for r in informe)

    return {
        "resumen": {
            "eventos": len(eventos),
            "ips": len(ips),
            "alto": sum(r["nivel"] == "alto" for r in informe),
            "medio": sum(r["nivel"] == "medio" for r in informe),
            "solo_ml": sum(r["solo_ml"] for r in informe),
            "por_tipo": dict(tipos.most_common()),
        },
        "modelo": {
            "algoritmo": "Isolation Forest (scikit-learn, no supervisado)",
            "entrenado": usar_ml,
            "motivo": None if usar_ml else f"Se necesitan al menos {MIN_IPS_ML} IPs distintas; hay {len(ips)}.",
            "caracteristicas": [desc for _, desc, usar, _ in CARACTERISTICAS if usar],
            "arboles": 300,
            "umbral_puntaje": UMBRAL_PUNTAJE,
        },
        "normal": medianas,
        "umbrales": umbrales,
        "ips": informe,
    }

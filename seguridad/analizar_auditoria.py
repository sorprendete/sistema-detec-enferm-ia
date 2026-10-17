"""Analizador defensivo del registro de auditoría de FitoScan.

Es el "mini proyecto" de las sesiones de ciberseguridad aplicado a este sistema:
lee los eventos, extrae indicadores con expresiones regulares, cuenta intentos fallidos
por IP, genera alertas por umbral y, además, detecta comportamiento anómalo con
Machine Learning (Isolation Forest, el mismo detector que usa el panel de Administración).

Entrada: el CSV que descargas en Administración → Registro de auditoría → Exportar CSV
         (columnas fecha, accion, estado, email, ip, navegador, detalle),
         o tráfico simulado con --simular.

Salidas (en la carpeta --salida):
  alertas.csv            IPs sospechosas con nivel, puntaje del modelo y motivo
  indicadores.txt        IPs, correos y URLs encontrados (sin duplicados)
  reporte.json           informe completo para integrarlo con otras herramientas
  puntajes.png           gráfico de las IPs más anómalas (si matplotlib está instalado)
  manifiesto_hashes.csv  SHA-256 de la entrada y de cada salida (integridad de la evidencia)

Uso:
    python seguridad/analizar_auditoria.py --simular
    python seguridad/analizar_auditoria.py --log auditoria_fitoscan.csv --umbral 5
"""
import argparse
import csv
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "backend"))
from app.services import amenazas, simulacion  # noqa: E402

PATRONES = {
    "ips": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "correos": re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"),
    "urls": re.compile(r"https?://[^\s\"',]+"),
}
LOGIN_FALLIDO = re.compile(r"incorrect|invalid|bloquead", re.I)


# ---------- 1. Lectura ----------
def leer_csv(ruta: Path) -> list[dict]:
    """Lee el CSV exportado sin modificar el original (la evidencia no se toca)."""
    with ruta.open("r", encoding="utf-8-sig", errors="ignore", newline="") as f:
        filas = list(csv.DictReader(f))
    eventos = []
    for f in filas:
        if not f.get("fecha") or not f.get("accion"):
            continue  # línea incompleta: se ignora en lugar de detener el análisis
        eventos.append({
            "fecha": f["fecha"], "accion": f["accion"], "estado": f.get("estado", ""),
            "email": f.get("email") or None, "ip": f.get("ip") or "desconocida",
            "agente": f.get("navegador") or f.get("agente") or "", "detalle": f.get("detalle") or "",
        })
    print(f"[i] {ruta.name}: {len(filas)} líneas leídas, {len(eventos)} eventos válidos")
    return eventos


# ---------- 2. Análisis ----------
def extraer_indicadores(eventos: list[dict]) -> dict[str, list[str]]:
    texto = "\n".join(f"{e['ip']} {e.get('email') or ''} {e.get('detalle') or ''}" for e in eventos)
    return {nombre: sorted(set(p.findall(texto))) for nombre, p in PATRONES.items()}


def fallos_por_ip(eventos: list[dict]) -> Counter:
    """El conteo clásico de la clase: intentos de inicio de sesión fallidos por IP."""
    fallos = Counter()
    for e in eventos:
        if e["accion"] == "login" and (e["estado"] in ("fallo", "bloqueado") or LOGIN_FALLIDO.search(e.get("detalle") or "")):
            fallos[e["ip"]] += 1
    return fallos


# ---------- 3. Reportes ----------
def sha256(ruta: Path) -> str:
    h = hashlib.sha256()
    with ruta.open("rb") as f:
        for bloque in iter(lambda: f.read(8192), b""):
            h.update(bloque)
    return h.hexdigest()


def guardar_alertas(informe: dict, ruta: Path) -> int:
    filas = [r for r in informe["ips"] if r["nivel"] != "normal"]
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ip", "nivel", "puntaje_ml", "anomalia_ml", "reglas", "motivo_ml", "eventos",
                    "fallos_login", "cuentas_distintas", "imagenes_rechazadas", "recomendacion"])
        for r in filas:
            c = r["caracteristicas"]
            w.writerow([r["ip"], r["nivel"].upper(), r["puntaje"], "sí" if r["anomalia_ml"] else "no",
                        "; ".join(f"{h['tipo']} ({h['detalle']})" for h in r["reglas"]),
                        "; ".join(r["explicacion"]), c["eventos"], c["fallos_login"], c["correos_distintos"],
                        c["rechazos"], recomendacion(r)])
    return len(filas)


def recomendacion(r: dict) -> str:
    tipos = {h["tipo"] for h in r["reglas"]}
    if tipos & {"Fuerza bruta", "Prueba de contraseñas en muchas cuentas"}:
        return "Bloquear la IP en el firewall y pedir cambio de contraseña a las cuentas atacadas"
    if "Creación masiva de cuentas" in tipos:
        return "Revisar y desactivar las cuentas creadas; activar CAPTCHA en el registro"
    if "Sondeo del modelo" in tipos:
        return "Revisar las imágenes del usuario y limitar su cuota de análisis"
    if r["solo_ml"]:
        return "Verificar con los dueños de las cuentas si reconocen el acceso"
    return "Revisar manualmente"


def grafico(informe: dict, ruta: Path) -> bool:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return False
    top = informe["ips"][:12][::-1]
    colores = {"alto": "#dc2626", "medio": "#d97706", "normal": "#94a3b8"}
    fig, ax = plt.subplots(figsize=(8, 4.8))
    ax.barh([r["ip"] for r in top], [r["puntaje"] for r in top], color=[colores[r["nivel"]] for r in top])
    ax.axvline(informe["modelo"]["umbral_puntaje"], color="#0f172a", linestyle="--", linewidth=1,
               label=f"Umbral de anomalía ({informe['modelo']['umbral_puntaje']})")
    ax.set_xlabel("Puntaje de anomalía (Isolation Forest)")
    ax.set_title("IPs más anómalas en la auditoría")
    ax.set_xlim(0, 100)
    ax.grid(axis="x", alpha=0.3)
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(ruta, dpi=130)
    plt.close(fig)
    return True


def main():
    p = argparse.ArgumentParser(description="Analizador defensivo de la auditoría de FitoScan")
    fuente = p.add_mutually_exclusive_group(required=True)
    fuente.add_argument("--log", type=Path, help="CSV exportado desde Administración")
    fuente.add_argument("--simular", action="store_true", help="usar una semana de tráfico simulado con ataques")
    p.add_argument("--umbral", type=int, default=amenazas.UMBRALES["fuerza_bruta"],
                   help="intentos fallidos por IP para alertar (por defecto 5)")
    p.add_argument("--salida", type=Path, default=Path("reporte_seguridad"))
    a = p.parse_args()

    a.salida.mkdir(parents=True, exist_ok=True)
    if a.simular:
        eventos = simulacion.generar()
        entrada = a.salida / "auditoria_simulada.csv"
        with entrada.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["fecha", "accion", "estado", "email", "ip", "navegador", "detalle"])
            w.writeheader()
            w.writerows({**{k: e[k] for k in ("fecha", "accion", "estado", "email", "ip", "detalle")},
                         "navegador": e["agente"]} for e in eventos)
        print(f"[i] Tráfico simulado guardado en {entrada}")
        eventos = leer_csv(entrada)
    else:
        if not a.log.is_file():
            sys.exit(f"[x] No existe el archivo {a.log}")
        entrada = a.log
        eventos = leer_csv(entrada)

    # Reglas clásicas
    fallos = fallos_por_ip(eventos)
    print(f"\n== Intentos fallidos por IP (umbral {a.umbral}) ==")
    for ip, n in fallos.most_common(5):
        print(f"  {'[ALERTA]' if n >= a.umbral else '        '} {ip:<16} {n} fallos")

    indicadores = extraer_indicadores(eventos)
    with (a.salida / "indicadores.txt").open("w", encoding="utf-8") as out:
        for nombre, hallazgos in indicadores.items():
            out.write(f"[{nombre}] {len(hallazgos)}\n" + "\n".join(hallazgos) + "\n\n")

    # Reglas + Machine Learning
    informe = amenazas.analizar(eventos, umbrales={**amenazas.UMBRALES, "fuerza_bruta": a.umbral})
    modelo = informe["modelo"]
    print(f"\n== Detección con Machine Learning ({modelo['algoritmo']}) ==")
    print("  " + (f"Entrenado con {informe['resumen']['ips']} IPs y {len(eventos)} eventos"
                  if modelo["entrenado"] else modelo["motivo"]))
    for r in [r for r in informe["ips"] if r["nivel"] != "normal"]:
        motivo = ", ".join(h["tipo"] for h in r["reglas"]) or "solo el modelo: " + "; ".join(r["explicacion"])
        print(f"  [{r['nivel'].upper():<5}] {r['ip']:<16} puntaje {r['puntaje']:>5}  {motivo}")

    n = guardar_alertas(informe, a.salida / "alertas.csv")
    reporte = {
        "fecha": datetime.now().isoformat(timespec="seconds"),
        "fuente": str(entrada),
        "indicadores": {k: len(v) for k, v in indicadores.items()},
        "fallos_por_ip": dict(fallos.most_common(20)),
        **informe,
    }
    (a.salida / "reporte.json").write_text(json.dumps(reporte, indent=2, ensure_ascii=False), encoding="utf-8")
    hay_grafico = grafico(informe, a.salida / "puntajes.png")

    # Manifiesto de hashes: permite comprobar después que la evidencia no fue alterada
    archivos = [entrada] + [a.salida / x for x in ("alertas.csv", "indicadores.txt", "reporte.json", "puntajes.png")
                            if (a.salida / x).exists()]
    with (a.salida / "manifiesto_hashes.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["archivo", "sha256"])
        for ruta in archivos:
            w.writerow([ruta.name, sha256(ruta)])

    print(f"\n[ok] {n} alertas en {a.salida / 'alertas.csv'}")
    print(f"[ok] Reporte, indicadores y manifiesto de hashes en {a.salida}/"
          + ("" if hay_grafico else "  (instala matplotlib para el gráfico)"))


if __name__ == "__main__":
    main()

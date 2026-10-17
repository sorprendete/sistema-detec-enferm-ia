"""Matriz de riesgos de FitoScan: Riesgo = Probabilidad × Impacto.

Lee seguridad/riesgos.json (activos, amenazas, vulnerabilidades, controles), calcula el
riesgo inherente (sin controles) y el residual (con los controles que ya tiene el sistema)
y los clasifica como en clase: 15 o más ALTO, 8 o más MEDIO, el resto BAJO.

Salidas en --salida:
  matriz_riesgos.csv   tabla completa para abrir en Excel
  matriz_riesgos.png   las dos matrices 5×5 lado a lado (si matplotlib está instalado)

La página Administración → Seguridad lee una copia de este archivo
(frontend/src/data/riesgos.json). Si cambias riesgos.json, ejecuta con --sincronizar.

Uso:
    python seguridad/matriz_riesgos.py
    python seguridad/matriz_riesgos.py --sincronizar
"""
import argparse
import csv
import json
import shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent
COPIA_FRONTEND = AQUI.parent / "frontend" / "src" / "data" / "riesgos.json"


def nivel(riesgo: int, niveles: dict) -> str:
    if riesgo >= niveles["alto"]:
        return "ALTO"
    if riesgo >= niveles["medio"]:
        return "MEDIO"
    return "BAJO"


def evaluar(datos: dict) -> list[dict]:
    niveles = datos["escala"]["niveles"]
    filas = []
    for r in datos["riesgos"]:
        inherente = r["probabilidad"] * r["impacto"]
        residual = r["residual"]["probabilidad"] * r["residual"]["impacto"]
        filas.append({**r, "riesgo": inherente, "nivel": nivel(inherente, niveles),
                      "riesgo_residual": residual, "nivel_residual": nivel(residual, niveles)})
    return sorted(filas, key=lambda f: -f["riesgo"])


def grafico(filas: list[dict], ruta: Path) -> bool:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib.colors import ListedColormap
    except ImportError:
        return False
    colores = ListedColormap(["#bbf7d0", "#fde68a", "#fecaca"])
    fondo = [[0 if p * i < 8 else 1 if p * i < 15 else 2 for p in range(1, 6)] for i in range(1, 6)]
    fig, ejes = plt.subplots(1, 2, figsize=(12, 5.6))
    for ax, titulo, clave in ((ejes[0], "Riesgo inherente (sin controles)", None),
                              (ejes[1], "Riesgo residual (con los controles de FitoScan)", "residual")):
        ax.imshow(fondo, cmap=colores, origin="lower", extent=(0.5, 5.5, 0.5, 5.5))
        celdas: dict[tuple, list[str]] = {}
        for f in filas:
            p, i = (f[clave]["probabilidad"], f[clave]["impacto"]) if clave else (f["probabilidad"], f["impacto"])
            celdas.setdefault((p, i), []).append(f["id"])
        for (p, i), ids in celdas.items():
            ax.text(p, i, "\n".join(", ".join(ids[k:k + 2]) for k in range(0, len(ids), 2)),
                    ha="center", va="center", fontsize=9, fontweight="bold", color="#0f172a")
        for p in range(1, 6):
            for i in range(1, 6):
                ax.text(p + 0.42, i - 0.38, p * i, ha="right", va="bottom", fontsize=7, color="#475569")
        ax.set_xticks(range(1, 6))
        ax.set_yticks(range(1, 6))
        ax.set_xlabel("Probabilidad")
        ax.set_ylabel("Impacto")
        ax.set_title(titulo)
        ax.set_xticks([x + 0.5 for x in range(0, 6)], minor=True)
        ax.set_yticks([x + 0.5 for x in range(0, 6)], minor=True)
        ax.grid(which="minor", color="white", linewidth=2)
        ax.tick_params(which="minor", length=0)
    fig.suptitle("Matriz de riesgos de FitoScan (Riesgo = Probabilidad × Impacto)")
    fig.tight_layout()
    fig.savefig(ruta, dpi=130)
    plt.close(fig)
    return True


def main():
    p = argparse.ArgumentParser(description="Matriz de riesgos de FitoScan")
    p.add_argument("--riesgos", type=Path, default=AQUI / "riesgos.json")
    p.add_argument("--salida", type=Path, default=Path("reporte_seguridad"))
    p.add_argument("--sincronizar", action="store_true", help="copiar riesgos.json al frontend")
    a = p.parse_args()

    datos = json.loads(a.riesgos.read_text(encoding="utf-8"))
    filas = evaluar(datos)

    print(f"{'ID':<4} {'Riesgo':<46} {'P×I':>5}  {'Nivel':<6} -> {'Residual':>8}")
    for f in filas:
        print(f"{f['id']:<4} {f['amenaza'][:46]:<46} {f['probabilidad']}×{f['impacto']}={f['riesgo']:<2} "
              f"{f['nivel']:<6} -> {f['riesgo_residual']:>3} {f['nivel_residual']}")
    for etiqueta, clave in (("inherente", "nivel"), ("residual", "nivel_residual")):
        conteo = {n: sum(f[clave] == n for f in filas) for n in ("ALTO", "MEDIO", "BAJO")}
        print(f"\nRiesgo {etiqueta}: " + ", ".join(f"{v} {k}" for k, v in conteo.items()), end="")
    print()
    pendientes = [f for f in filas if f.get("pendiente")]
    if pendientes:
        print("\nPendientes para reducir el riesgo residual:")
        for f in pendientes:
            print(f"  {f['id']}: {f['pendiente']}")

    a.salida.mkdir(parents=True, exist_ok=True)
    with (a.salida / "matriz_riesgos.csv").open("w", newline="", encoding="utf-8") as out:
        w = csv.writer(out)
        w.writerow(["id", "activo", "amenaza", "vulnerabilidad", "pilar_cia", "probabilidad", "impacto",
                    "riesgo", "nivel", "controles", "tipo_control", "tratamiento", "riesgo_residual",
                    "nivel_residual", "pendiente"])
        for f in filas:
            w.writerow([f["id"], f["activo"], f["amenaza"], f["vulnerabilidad"], f["pilar"], f["probabilidad"],
                        f["impacto"], f["riesgo"], f["nivel"], "; ".join(f["controles"]), f["tipo_control"],
                        f["tratamiento"], f["riesgo_residual"], f["nivel_residual"], f.get("pendiente") or ""])
    hay_grafico = grafico(filas, a.salida / "matriz_riesgos.png")
    print(f"\n[ok] {a.salida / 'matriz_riesgos.csv'}" + (f" y matriz_riesgos.png" if hay_grafico else ""))

    if a.sincronizar:
        shutil.copyfile(a.riesgos, COPIA_FRONTEND)
        print(f"[ok] Copiado a {COPIA_FRONTEND}")
    elif COPIA_FRONTEND.exists() and COPIA_FRONTEND.read_bytes() != a.riesgos.read_bytes():
        print("[!] La copia del frontend es distinta: ejecuta con --sincronizar")


if __name__ == "__main__":
    main()

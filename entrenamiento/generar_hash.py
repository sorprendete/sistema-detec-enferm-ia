"""Genera (o verifica) la huella SHA-256 del modelo.

Uso:
    python generar_hash.py                 # recalcula y guarda modelo_hash.txt tras reentrenar
    python generar_hash.py --verificar     # solo comprueba que el modelo no fue alterado
"""
import argparse
import hashlib
import hmac
import sys
from pathlib import Path

MODELO_DIR = Path(__file__).resolve().parent.parent / "backend" / "modelo"


def sha256(ruta: Path) -> str:
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for trozo in iter(lambda: f.read(1024 * 1024), b""):
            h.update(trozo)
    return h.hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--modelo", type=Path, default=MODELO_DIR / "modelo_plantas.keras")
    p.add_argument("--hash", type=Path, default=MODELO_DIR / "modelo_hash.txt")
    p.add_argument("--verificar", action="store_true")
    a = p.parse_args()

    calculado = sha256(a.modelo)
    if a.verificar:
        esperado = a.hash.read_text().split()[0].strip().lower()
        if hmac.compare_digest(esperado, calculado):
            print(f"OK · el modelo es íntegro\n{calculado}")
        else:
            print(f"ALERTA · el modelo fue modificado\nesperado:  {esperado}\ncalculado: {calculado}")
            sys.exit(1)
    else:
        a.hash.write_text(calculado)
        print(f"Hash guardado en {a.hash}\n{calculado}")


if __name__ == "__main__":
    main()

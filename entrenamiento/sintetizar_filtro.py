"""Genera fotos sintéticas para que el filtro de cultivo acepte hojas fuera del laboratorio.

Problema que resuelve: PlantVillage solo tiene UNA hoja suelta sobre un fondo gris de
laboratorio. Con eso, el filtro rechazaba como "otra planta" fotos normales de papa:
hojas sobre fondo blanco, sobre una mesa de madera, varias hojas juntas o la hoja
compuesta completa (tallo con varios foliolos).

Cómo funciona:
  1. Usa la versión "segmented" de PlantVillage (la hoja ya recortada sobre negro)
     y saca la silueta de cada hoja.
  2. Pega esas hojas sobre fondos variados (blanco, gris, madera, tierra, tela,
     fotos desenfocadas) en tres composiciones:
        - una sola hoja, girada y de distinto tamaño
        - 2 a 4 hojas sueltas (como una foto de catálogo)
        - hoja compuesta: un tallo con un foliolo en la punta y pares a los lados
  3. Lo hace con las 38 clases, también con las de OTROS cultivos, para que el
     filtro no aprenda que "fondo blanco = papa": el fondo deja de ser una pista y
     tiene que fijarse en la hoja.

Las imágenes se guardan en <salida>/<categoria>/sinteticas/, así que con --salida dataset_filtro
quedan dentro de las carpetas que lee entrenar_filtro.py.

Uso:
    python sintetizar_filtro.py --segmentadas PlantVillage/raw/segmented --salida dataset_filtro
    python sintetizar_filtro.py ... --fondos carpeta_con_fotos   # opcional: fotos para fondos desenfocados
"""
import argparse
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

LADO = 448
EXTS = {".jpg", ".jpeg", ".png"}


def categoria(clase: str) -> str:
    if clase.startswith("Pepper"):
        return "pimiento"
    if clase.startswith("Potato"):
        return "papa"
    if clase.startswith("Tomato"):
        return "tomate"
    return "otra_planta"


def recortar_hoja(ruta: Path) -> Image.Image | None:
    """Hoja con canal alfa, a partir de la imagen segmentada (fondo negro)."""
    rgb = Image.open(ruta).convert("RGB")
    mascara = Image.fromarray(((np.asarray(rgb).max(axis=2) > 18) * 255).astype(np.uint8))
    # Cierra huecos pequeños (lesiones oscuras) y quita puntos sueltos del borde
    mascara = mascara.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MinFilter(3))
    caja = mascara.getbbox()
    if not caja or (caja[2] - caja[0]) * (caja[3] - caja[1]) < 40 * 40:
        return None
    # Algunas imágenes "segmentadas" no tienen el fondo quitado: se descartan
    if np.asarray(mascara.crop(caja)).mean() > 0.97 * 255:
        return None
    hoja = rgb.copy()
    hoja.putalpha(mascara.filter(ImageFilter.GaussianBlur(0.8)))
    return hoja.crop(caja)


# ---------- fondos ----------
def _ruido(r, escala, suave):
    return np.asarray(Image.fromarray((r.random((LADO // escala, LADO // escala)) * 255).astype(np.uint8))
                      .resize((LADO, LADO), Image.BICUBIC).filter(ImageFilter.GaussianBlur(suave)), np.float32) / 255


def fondo(r: np.random.Generator, fotos: list[Path]) -> Image.Image:
    tipo = r.choice(["blanco", "blanco", "claro", "madera", "madera", "tierra", "tela", "foto", "oscuro"])
    if tipo == "foto" and not fotos:
        tipo = "claro"
    if tipo == "foto":
        img = Image.open(fotos[r.integers(len(fotos))]).convert("RGB").resize((LADO, LADO))
        return img.filter(ImageFilter.GaussianBlur(r.uniform(6, 14)))
    if tipo == "blanco":
        base = np.full((LADO, LADO, 3), r.uniform(232, 255), np.float32)
        base += (np.linspace(0, r.uniform(-18, 6), LADO)[:, None, None])
    elif tipo == "claro":
        base = np.ones((LADO, LADO, 3), np.float32) * r.uniform(150, 235, 3)
    elif tipo == "oscuro":
        base = np.ones((LADO, LADO, 3), np.float32) * r.uniform(20, 70, 3)
    elif tipo == "madera":
        color = np.array([r.uniform(150, 215), r.uniform(105, 160), r.uniform(70, 115)], np.float32)
        y = np.arange(LADO)[:, None]
        vetas = np.sin(y / r.uniform(3, 9) + _ruido(r, 8, 6) * r.uniform(6, 14)) * 0.5 + 0.5
        base = color * (0.82 + 0.22 * vetas[..., None])
        if r.random() < 0.5:
            base = np.rot90(base).copy()
    elif tipo == "tierra":
        color = np.array([r.uniform(70, 130), r.uniform(50, 95), r.uniform(30, 65)], np.float32)
        base = color * (0.7 + 0.6 * _ruido(r, 4, 1.5)[..., None])
    else:  # tela o papel con textura suave
        base = np.ones((LADO, LADO, 3), np.float32) * r.uniform(120, 240, 3)
        base *= (0.92 + 0.12 * _ruido(r, 2, 0.6)[..., None])
    base += r.normal(0, 3, base.shape)
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))


# ---------- composiciones ----------
def pegar(lienzo, hoja, tam, angulo, centro, sombra=True):
    h = hoja.copy()
    h.thumbnail((tam, tam))
    h = h.rotate(angulo, expand=True, resample=Image.BICUBIC)
    x, y = int(centro[0] - h.width / 2), int(centro[1] - h.height / 2)
    if sombra:
        s = Image.new("RGBA", h.size, (0, 0, 0, 0))
        s.putalpha(h.getchannel("A").point(lambda a: int(a * 0.28)).filter(ImageFilter.GaussianBlur(5)))
        lienzo.alpha_composite(s, (x + 5, y + 6))
    lienzo.alpha_composite(h, (x, y))


def una(lienzo, hojas, r):
    pegar(lienzo, hojas[0], int(LADO * r.uniform(0.55, 0.92)), r.uniform(0, 360),
          (LADO / 2 + r.normal(0, 20), LADO / 2 + r.normal(0, 20)))


def varias(lienzo, hojas, r):
    n = int(r.integers(2, 5))
    celdas = [(0.27, 0.27), (0.73, 0.27), (0.27, 0.73), (0.73, 0.73)]
    r.shuffle(celdas)
    for hoja, (cx, cy) in zip(hojas[:n], celdas):
        pegar(lienzo, hoja, int(LADO * r.uniform(0.36, 0.5)), r.uniform(0, 360),
              (cx * LADO + r.normal(0, 12), cy * LADO + r.normal(0, 12)))


def compuesta(lienzo, hojas, r):
    """Tallo vertical con foliolo terminal y pares laterales (como la hoja de papa o tomate)."""
    x0, x1 = LADO / 2 + r.normal(0, 15), LADO / 2 + r.normal(0, 25)
    y_arriba, y_abajo = LADO * 0.14, LADO * 0.98
    tallo = [(x0 + (x1 - x0) * t + np.sin(t * 3) * 8, y_abajo - (y_abajo - y_arriba) * t) for t in np.linspace(0, 1, 30)]
    color_tallo = tuple(int(v) for v in (r.uniform(70, 120), r.uniform(110, 150), r.uniform(40, 70), 255))
    ImageDraw.Draw(lienzo).line(tallo, fill=color_tallo, width=int(r.integers(4, 9)))
    pares = int(r.integers(2, 4))
    k = 1
    for i in range(pares):
        t = 0.32 + 0.55 * i / max(pares - 1, 1)
        px, py = tallo[int((1 - t) * 29)]
        tam = int(LADO * r.uniform(0.24, 0.34))
        for lado in (-1, 1):
            pegar(lienzo, hojas[k % len(hojas)], tam, lado * r.uniform(50, 80) + 90 + r.normal(0, 8),
                  (px + lado * tam * 0.45, py), sombra=False)
            k += 1
    pegar(lienzo, hojas[0], int(LADO * r.uniform(0.3, 0.4)), 90 + r.normal(0, 10),
          (tallo[-1][0], tallo[-1][1] + LADO * 0.08), sombra=False)


def componer(hojas, r, fotos):
    lienzo = fondo(r, fotos).convert("RGBA")
    [una, varias, compuesta][r.choice(3, p=[0.4, 0.3, 0.3])](lienzo, hojas, r)
    img = lienzo.convert("RGB")
    img = ImageEnhance.Brightness(img).enhance(r.uniform(0.8, 1.15))
    img = ImageEnhance.Color(img).enhance(r.uniform(0.85, 1.2))
    if r.random() < 0.3:
        img = img.filter(ImageFilter.GaussianBlur(r.uniform(0.5, 1.4)))
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--segmentadas", type=Path, required=True, help="PlantVillage raw/segmented (una carpeta por clase)")
    ap.add_argument("--salida", type=Path, required=True)
    ap.add_argument("--fondos", type=Path, help="fotos para fondos desenfocados (opcional)")
    ap.add_argument("--por-cultivo", type=int, default=700, help="imágenes por cultivo; otra_planta recibe el doble")
    ap.add_argument("--semilla", type=int, default=0)
    a = ap.parse_args()

    r = np.random.default_rng(a.semilla)
    random.seed(a.semilla)
    fotos = [p for p in a.fondos.rglob("*") if p.suffix.lower() in EXTS | {".jpeg"}] if a.fondos else []

    grupos: dict[str, list] = {}
    for carpeta in sorted(p for p in a.segmentadas.iterdir() if p.is_dir()):
        hojas = [h for h in (recortar_hoja(p) for p in carpeta.iterdir() if p.suffix.lower() in EXTS) if h]
        if hojas:
            grupos.setdefault(categoria(carpeta.name), []).append(hojas)
        print(f"{carpeta.name}: {len(hojas)} hojas")

    for cat, clases in grupos.items():
        destino = a.salida / cat / "sinteticas"
        destino.mkdir(parents=True, exist_ok=True)
        total = a.por_cultivo * (2 if cat == "otra_planta" else 1)
        for i in range(total):
            hojas = clases[r.integers(len(clases))]        # todas las hojas de una imagen son de la misma clase
            elegidas = [hojas[j] for j in r.choice(len(hojas), size=min(8, len(hojas)), replace=False)]
            componer(elegidas, r, fotos).save(destino / f"sint_{i:05d}.jpg", quality=int(r.integers(80, 95)))
        print(f"{cat}: {total} imágenes sintéticas")


if __name__ == "__main__":
    main()

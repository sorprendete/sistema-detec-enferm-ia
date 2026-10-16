---
title: Detector Enfermedades Plantas
emoji: 🌿
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# Backend · API de detección de enfermedades en plantas

API FastAPI que:

1. Verifica el **SHA-256** de `modelo/modelo_plantas.keras` contra `modelo/modelo_hash.txt` antes de cargarlo (si no coincide, el servidor no arranca).
2. Carga el modelo MobileNetV2 y las 15 clases de `modelo/clases.json`.
3. Expone `POST /predict` (requiere JWT de Supabase), `GET /historial` y `GET /health`.

La cabecera YAML de arriba es la que Hugging Face Spaces necesita para construir la imagen Docker.

## Ejecutar en local

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows  (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env       # y completa los valores
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva: http://localhost:8000/docs

## Pruebas

```bash
python -m pytest -q
```

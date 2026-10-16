# Sistema Seguro de Detección de Enfermedades en Plantas mediante IA

Aplicación web que analiza fotos de hojas de **pimiento, papa y tomate** y detecta si la planta está sana o tiene alguna de 12 enfermedades (15 clases en total), con módulos de seguridad de la información y de entrenamiento.

- **Modelo:** MobileNetV2 · Accuracy 96.5 % en fotos de laboratorio y 48 % en fotos reales de campo (ver `entrenamiento/metricas.md`)
- **Filtro de cultivo:** rechaza hojas de otras plantas e imágenes que no son hojas antes de diagnosticar
- **Backend:** FastAPI + TensorFlow → Azure Container Apps
- **Frontend:** React + Vite → Vercel
- **Auth y base de datos:** Supabase (JWT + PostgreSQL con Row Level Security)

## Estructura

```
backend/        API de IA (verificación SHA-256, /predict, /historial, login auditado, /admin)
  modelo/       modelo_plantas.keras, clases.json, modelo_hash.txt, filtro_cultivos.keras, filtro_hash.txt
frontend/       Interfaz web (login, registro, diagnóstico, historial, administración)
database/       SQL de tablas, políticas RLS, roles/auditoría y limpieza de datos
entrenamiento/  Notebook de Colab, generador de hash y métricas
docs/           Arquitectura, seguridad y guía de despliegue
```

## Empezar

- Ejecutar en local y desplegar: [`docs/despliegue.md`](docs/despliegue.md)
- Controles de seguridad: [`docs/arquitectura.md`](docs/arquitectura.md)
- Verificar la integridad del modelo: `python entrenamiento/generar_hash.py --verificar`

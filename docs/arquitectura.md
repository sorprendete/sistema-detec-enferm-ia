# Arquitectura y flujo de seguridad

```
Usuario ──► Frontend React (Vercel) ──login──► Supabase Auth ──► JWT
                │
                └── POST /predict (imagen + JWT) ──► Backend FastAPI (Hugging Face Spaces)
                                                      1. Verifica el JWT (firma, expiración, audiencia)
                                                      2. Rate limit por usuario (20/min)
                                                      3. Valida la imagen (magic bytes, 5 MB, Pillow)
                                                      4. Filtro de cultivo: ¿es hoja de pimiento, papa o tomate? Si no, la rechaza
                                                      5. Predice la enfermedad (modelos cargados solo si su SHA-256 coincide)
                                                      6. Registra el análisis en Supabase con el JWT del usuario (RLS)
```

## Controles de seguridad

| # | Control | Archivo |
|---|---|---|
| 1 | Integridad SHA-256 del clasificador y del filtro de cultivo antes de cargarlos; si falla, el servidor no arranca | `backend/app/security/integridad.py` |
| 2 | Autenticación JWT de Supabase (HS256 o JWKS ES256/RS256) | `backend/app/security/auth.py` |
| 3 | Validación de imágenes por firma binaria, tamaño y decodificación completa | `backend/app/security/validacion.py` |
| 4 | Rate limiting por usuario | `backend/app/security/rate_limit.py` |
| 5 | CORS restringido y cabeceras de seguridad (backend y `vercel.json`, con CSP) | `backend/app/main.py`, `frontend/vercel.json` |
| 6 | Auditoría inmutable: cada análisis guarda SHA-256 de la imagen y del modelo; RLS impide ver datos ajenos y editar o borrar registros | `database/*.sql` |
| 7 | Secretos fuera del código (`.env`, Secrets de HF y Vercel) | `.env.example`, `.gitignore` |
| 8 | Política de contraseñas fuertes en el registro y mensajes de error genéricos en el login | `frontend/src/pages/` |
| 9 | Contenedor con usuario sin privilegios y archivos del modelo en solo lectura | `backend/Dockerfile` |
| 10 | Filtro de cultivo: rechaza imágenes fuera de dominio (otras plantas o fotos que no son hojas) en vez de dar un diagnóstico falso | `backend/app/services/inferencia.py`, `entrenamiento/entrenar_filtro.py` |

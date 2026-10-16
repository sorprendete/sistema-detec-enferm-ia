# Arquitectura y flujo de seguridad

```
Usuario ──► Frontend React (Vercel) ──POST /auth/login──► Backend ──► Supabase Auth ──► JWT
                │                                     (registra éxito/fallo e IP; bloquea tras 5 fallos)
                │
                └── POST /predict (imagen + JWT) ──► Backend FastAPI (Azure Container Apps)
                                                      1. Verifica el JWT (firma, expiración, audiencia)
                                                      2. Rate limit por usuario (20/min)
                                                      3. Valida la imagen (magic bytes, 5 MB, Pillow)
                                                      4. Filtro de cultivo: ¿es hoja de pimiento, papa o tomate? Si no, la rechaza
                                                      5. Predice la enfermedad (modelos cargados solo si su SHA-256 coincide)
                                                      6. Registra el análisis en Supabase con el JWT del usuario (RLS)
                                                      7. Escribe el evento en el registro de auditoría

Administrador ──► /admin (rol verificado en el backend y otra vez en Postgres con es_admin())
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
| 7 | Secretos fuera del código (`.env`, variables de entorno de Azure y Vercel) | `.env.example`, `.gitignore` |
| 8 | Política de contraseñas fuertes (validada en el frontend y en el backend) y mensajes de error genéricos en el login | `frontend/src/pages/`, `backend/app/schemas/auth.py` |
| 9 | Contenedor con usuario sin privilegios y archivos del modelo en solo lectura | `backend/Dockerfile` |
| 10 | Filtro de cultivo: rechaza imágenes fuera de dominio (otras plantas o fotos que no son hojas) en vez de dar un diagnóstico falso | `backend/app/services/inferencia.py`, `entrenamiento/entrenar_filtro.py` |
| 11 | Bloqueo por fuerza bruta: 5 contraseñas incorrectas de un correo lo bloquean 15 min; límite de intentos por IP | `backend/app/security/fuerza_bruta.py`, `backend/app/routers/auth.py` |
| 12 | Registro de auditoría de accesos (login, registro, logout, análisis, acciones del admin) con IP y navegador; solo lo escribe el servidor y solo lo lee el admin | `backend/app/services/auditoria.py`, `database/administracion.sql` |
| 13 | Control de acceso por roles: un único administrador; el usuario no puede cambiar su propio rol (permiso por columna) | `backend/app/security/roles.py`, `database/administracion.sql` |

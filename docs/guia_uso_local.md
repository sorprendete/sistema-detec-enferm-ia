# Guía de uso local, pantalla por pantalla

Necesitas: Python (ya lo tienes), **Node.js 20 o superior** (https://nodejs.org, botón "LTS") y una cuenta gratis de **Supabase**.

Al final tendrás **2 terminales abiertas** (backend y frontend) y el navegador en `http://localhost:5173`.

---

## PARTE A · Supabase (solo la primera vez)

### Pantalla 1 · Crear cuenta
1. Entra a **https://supabase.com** → botón **Start your project**.
2. Elige **Continue with GitHub** o regístrate con tu correo.

### Pantalla 2 · Crear el proyecto
Botón **New project**. Completa:

| Campo | Qué poner |
|---|---|
| Organization | La que aparece por defecto |
| Project name | `detector-plantas` |
| Database Password | Pulsa **Generate a password** y **guárdala** en un bloc de notas |
| Region | **South America (São Paulo)** |
| Plan | Free |

Pulsa **Create new project** y espera 1–2 minutos hasta que termine.

### Pantalla 3 · Crear las tablas (SQL Editor)
1. Menú izquierdo → **SQL Editor** (icono `>_`).
2. Abre en el Bloc de notas `C:\laragon\www\Sistema_Detec_Enferm_IA\database\schema.sql`, copia **todo** y pégalo en el editor.
3. Pulsa **Run** (o `Ctrl + Enter`). Debe decir **Success. No rows returned**.
4. Borra el editor, pega todo `database\politicas_rls.sql` y pulsa **Run** de nuevo. Debe decir **Success**.
5. Haz lo mismo con `database\administracion.sql` (roles de usuario y registro de auditoría).
6. Comprueba: menú izquierdo → **Table Editor**. Deben aparecer las tablas **analisis**, **auditoria** y **perfiles**.

### Pantalla 4 · Configurar el login
1. Menú izquierdo → **Authentication** → **URL Configuration**.
   - **Site URL:** `http://localhost:5173` → **Save**.
2. **Authentication** → **Sign In / Providers** → **Email**.
   - Para probar en local es más cómodo **desactivar "Confirm email"** → **Save**. Así no esperas correos (el plan gratis envía muy pocos por hora). Para producción vuelve a activarlo.

### Pantalla 5 · Copiar tus claves
Menú izquierdo → **Project Settings** (engranaje) → **API Keys** / **Data API**. Copia en tu bloc de notas:

| Dato | Dónde está | Ejemplo |
|---|---|---|
| **Project URL** | Project Settings → Data API (o arriba en "Connect") | `https://abcdxyz.supabase.co` |
| **anon / publishable key** | Project Settings → API Keys (pestaña *Legacy API keys* → `anon public`, o la *Publishable key* `sb_publishable_...`) | `eyJhbGciOi...` o `sb_publishable_...` |

| **service_role / secret key** | Project Settings → API Keys (*Legacy API keys* → `service_role`, o la *Secret key* `sb_secret_...`) | Solo para el `.env` del **backend** |

**Importante:** la clave `service_role` / `secret` es muy sensible. Va **solo** en `backend\.env` (y en Azure como secreto), **nunca** en el frontend ni en GitHub. El backend la usa únicamente para escribir el registro de auditoría y para que el administrador active o desactive cuentas.

### Pantalla 5b · Crear la cuenta de administrador (solo una)
1. Menú izquierdo → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe el correo y una contraseña segura del administrador, marca **Auto Confirm User** y pulsa **Create user**.
3. **SQL Editor** → ejecuta esta línea con ese correo:
   ```sql
   update public.perfiles set rol = 'admin' where email = 'admin@tu-correo.com';
   ```
   Debe decir **Success. 1 rows affected**. El sistema solo permite **un** administrador: si intentas nombrar a otro, la base de datos lo rechaza.
4. Al iniciar sesión con esa cuenta aparece en el menú **Administración → Usuarios y auditoría**.

---

## PARTE B · Backend (Terminal 1)

### Pantalla 6 · Archivo `.env` del backend
En PowerShell:
```powershell
cd C:\laragon\www\Sistema_Detec_Enferm_IA\backend
copy .env.example .env
notepad .env
```
En el Bloc de notas deja el archivo así (con **tus** valores):
```
SUPABASE_URL=https://abcdxyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...tu_clave_anon...
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...tu_clave_service_role...
CORS_ORIGINS=http://localhost:5173
MAX_IMAGE_MB=5
RATE_LIMIT_POR_MINUTO=20
UMBRAL_CONFIANZA=0.75
```
- Deja `SUPABASE_JWT_SECRET` **vacío** al principio (ver *Problemas frecuentes* si luego da error 401).
- Guarda (`Ctrl + S`) y cierra.

### Pantalla 7 · Encender el backend
```powershell
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
Debes ver algo como:
```
INFO seguridad.integridad: Integridad del modelo verificada (SHA-256 117a7cbe...)
INFO servicios.modelo: Modelo cargado: 15 clases
INFO:     Uvicorn running on http://127.0.0.1:8000
```
**No cierres esta terminal.**

Comprueba en el navegador:
- `http://localhost:8000/health` → debe mostrar `"integridad_verificada": true` y `"num_clases": 15`.
- `http://localhost:8000/docs` → documentación interactiva de la API (útil para tu exposición).

---

## PARTE C · Frontend (Terminal 2)

### Pantalla 8 · Archivo `.env.local` del frontend
Abre **otra** ventana de PowerShell:
```powershell
cd C:\laragon\www\Sistema_Detec_Enferm_IA\frontend
copy .env.example .env.local
notepad .env.local
```
Déjalo así:
```
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...tu_clave_anon...
VITE_API_URL=http://localhost:8000
```
Guarda y cierra.

### Pantalla 9 · Encender el frontend
```powershell
npm install
npm run dev
```
(`npm install` solo la primera vez.) Verás:
```
  ➜  Local:   http://localhost:5173/
```
**No cierres esta terminal.** Abre `http://localhost:5173` en el navegador.

---

## PARTE D · Usar la aplicación

### Pantalla 10 · Iniciar sesión (te redirige aquí automáticamente)
La primera vez no tienes cuenta: pulsa **Regístrate**.

### Pantalla 11 · Crear cuenta
| Campo | Qué poner |
|---|---|
| Nombre | Tu nombre, p. ej. `Ronald` |
| Correo electrónico | Tu correo real |
| Contraseña | Mínimo 8 caracteres con **mayúscula, minúscula, número y símbolo**, p. ej. `Plantas#2026` |
| Confirmar contraseña | La misma |

Pulsa **Registrarme**.
- Si desactivaste *Confirm email*: vuelve a **Inicia sesión**.
- Si lo dejaste activo: abre el correo de Supabase, pulsa el enlace y luego inicia sesión.

### Pantalla 12 · Iniciar sesión
Escribe el correo y la contraseña → **Ingresar**. Arriba aparecerá tu correo y los menús **Diagnóstico** e **Historial**.

### Pantalla 13 · Diagnóstico
1. Arrastra una foto de una hoja a la zona punteada, o haz clic para elegirla (JPG, PNG o WebP, máximo 5 MB).
2. Verás la vista previa. Pulsa **Analizar hoja**.
3. La tarjeta de resultado muestra:
   - **Cultivo** (Pimiento, Papa o Tomate) y **diagnóstico** (✅ hoja sana o ⚠️ enfermedad).
   - **Confianza** del modelo con una barra.
   - **Resultado no concluyente** si la confianza es menor al 75 %: el sistema no da diagnóstico, porque puede ser algo que el modelo no conoce (helada, deficiencias, plagas).
   - **Aviso de baja certeza** (amarillo) si la enfermedad se confunde fácilmente (tizón temprano, mancha diana, virus del mosaico).
   - **Recomendación** de manejo.
   - **Otras posibilidades**: las 3 clases más probables.
   - **Datos de seguridad y trazabilidad** (despliégalo): SHA-256 de la imagen y del modelo verificado, y tiempo de análisis.

💡 Consejo: usa fotos de **una sola hoja**, centrada, con buena luz y fondo liso, como las del dataset PlantVillage. Ahí el modelo da sus mejores resultados (96 %); con fotos reales de campo acierta alrededor de la mitad.

**Si subes una hoja de otra planta** (maíz, uva, rosa…) **o una imagen que no es una hoja**, verás la tarjeta amarilla **"Imagen no admitida"** con los 3 cultivos que sí se pueden analizar. Esas imágenes no se guardan en el historial.

### Pantalla 14 · Panel y Modelo
- **Panel** (menú lateral): indicadores de tus análisis, gráfico de análisis por día, diagnósticos más frecuentes y análisis por cultivo. Pasa el cursor sobre las barras para ver detalles.
- **Modelo y métricas:** accuracy, precisión, recall, F1, F1 por condición, matriz de confusión interactiva y las huellas SHA-256 de los dos modelos.

### Pantalla 15 · Historial
Menú **Historial**: filtros por cultivo y estado, botón **Exportar CSV** y tabla con fecha, cultivo, diagnóstico, confianza y huella SHA-256 de cada imagen que analizaste. Cada usuario solo ve sus propios análisis (RLS), y los registros no se pueden editar ni borrar.

También puedes verlos en Supabase → **Table Editor** → **analisis**.

### Salir
Botón **Salir** arriba a la derecha.

---

## Demostraciones de seguridad para tu exposición

| Qué mostrar | Cómo hacerlo | Resultado esperado |
|---|---|---|
| Integridad del modelo | Corre `python entrenamiento\generar_hash.py --verificar` desde la carpeta principal | `OK · el modelo es íntegro` |
| Modelo alterado = bloqueado | En `backend`, `python -m pytest -q tests\test_integridad.py` (cambia 1 byte de una copia del modelo) | Las pruebas pasan: el modelo alterado se rechaza |
| API sin sesión | En `http://localhost:8000/docs` → `POST /predict` → *Try it out* sin token | **401** "Sesión inválida o expirada" |
| Archivo falso | Renombra un `.txt` a `.png` y súbelo | "Formato no permitido" |
| Rate limiting | Analiza más de 20 imágenes en un minuto | "Demasiados análisis seguidos" |
| Contraseña débil | Regístrate con `123456` | El formulario indica qué le falta |

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| El login funciona pero al analizar sale **"Sesión inválida o expirada"** | Tu proyecto usa el secreto JWT antiguo. Supabase → Project Settings → **JWT Keys** → copia el **Legacy JWT secret** y ponlo en `SUPABASE_JWT_SECRET=` del `backend\.env`. Reinicia el backend (`Ctrl + C` y otra vez `uvicorn ...`). |
| **"No se pudo conectar con el servidor"** | La Terminal 1 (backend) está cerrada o con error. Vuelve a ejecutar `uvicorn app.main:app --reload --port 8000`. |
| Error **CORS** en la consola del navegador (F12) | Revisa que `CORS_ORIGINS=http://localhost:5173` en `backend\.env` y reinicia el backend. |
| Pantalla en blanco o "Faltan VITE_SUPABASE_URL" | Revisa `frontend\.env.local` y reinicia `npm run dev`. |
| `npm` no se reconoce | Instala Node.js LTS desde https://nodejs.org y abre una terminal nueva. |
| "Email not confirmed" al iniciar sesión | Confirma el correo o desactiva *Confirm email* (Pantalla 4). |
| El historial sale vacío después de analizar | Revisa en la Terminal 1 si aparece "No se pudo registrar el análisis" y que ejecutaste los 2 archivos SQL. |

## Para volver a usarlo otro día
```powershell
# Terminal 1
cd C:\laragon\www\Sistema_Detec_Enferm_IA\backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2
cd C:\laragon\www\Sistema_Detec_Enferm_IA\frontend
npm run dev
```
Luego abre `http://localhost:5173`.

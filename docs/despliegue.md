# Despliegue completo paso a paso

Arquitectura final:

| Parte | Servicio | Costo |
|---|---|---|
| Frontend (React) | **Vercel** | Gratis, sin vencimiento |
| Backend (FastAPI + IA) | **Azure Container Apps** | Se descuenta de los créditos de Azure |
| Base de datos y login | **Supabase** | Gratis |
| Imagen Docker del backend | **GitHub Container Registry** | Gratis |

Orden de los pasos: **1) GitHub → 2) Supabase → 3) Imagen Docker → 4) Azure → 5) Vercel → 6) Conectar todo → 7) Verificar**.

---

## 0. Antes de empezar

Cuentas que necesitas: GitHub, Supabase y Vercel (gratis) y Azure (ya la tienes, con créditos).

Programas en tu PC:

```powershell
git --version          # https://git-scm.com/download/win
git lfs version        # viene incluido con Git para Windows
python --version       # ya lo tienes
```

Abre una terminal (PowerShell o Git Bash) en la carpeta del proyecto:

```powershell
cd C:\laragon\www\Sistema_Detec_Enferm_IA
```

---

## 1. Subir el proyecto a GitHub

1. En https://github.com/new crea un repositorio llamado `sistema-detec-enferm-ia` (usa minúsculas). Puede ser **privado**. No marques "Add README".
2. En la terminal, inicializa el repositorio:

```powershell
git lfs install
git init -b main
git add .
git status
```

3. **Revisa la lista de `git status`**: no debe aparecer ningún `.env` ni `.env.local` (el `.gitignore` ya los excluye). Si aparece alguno, no sigas y avísame.
4. Sube el código:

```powershell
git commit -m "Sistema de detección de enfermedades en plantas"
git remote add origin https://github.com/TU_USUARIO/sistema-detec-enferm-ia.git
git push -u origin main
```

Los modelos `.keras` se suben con Git LFS (configurado en `.gitattributes`).

---

## 2. Supabase (base de datos y login)

Si ya creaste tu proyecto cuando probaste en local, no crees otro: ejecuta solo `database/administracion.sql` (punto 2) y sigue desde el punto 4.

1. En https://supabase.com crea un proyecto (región São Paulo).
2. **SQL Editor → New query**: ejecuta, en este orden, `database/schema.sql`, `database/politicas_rls.sql` y `database/administracion.sql`. Si ya tenías los dos primeros, ejecuta solo `administracion.sql`.
3. **Authentication → Sign In / Providers → Email**: deja activado "Confirm email".
4. **Project Settings → API**: copia *Project URL* y la *anon public key*.
5. **Project Settings → API Keys**: copia también la clave **service_role** (o *Secret key* `sb_secret_...`). Es muy sensible: solo irá en Azure como secreto.
6. **Project Settings → JWT Keys**: si la clave activa es "Legacy JWT secret", copia ese secreto. Si usa claves ECC/RSA, no necesitas nada.
7. **Crea el administrador (solo uno):** **Authentication → Users → Add user → Create new user**, con su correo y una contraseña segura, marcando **Auto Confirm User**. Luego, en **SQL Editor**:
   ```sql
   update public.perfiles set rol = 'admin' where email = 'admin@tu-correo.com';
   ```
   La base de datos no permite un segundo administrador.

Anota estos valores. Los vas a usar en Azure y Vercel:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   (secreta)
SUPABASE_JWT_SECRET=         (vacío si no es Legacy)
```

---

## 3. Imagen Docker del backend (para Azure)

Azure necesita una imagen Docker ya construida. El archivo `.github/workflows/imagen-backend.yml` del proyecto la construye gratis en GitHub cada vez que cambias `backend/`.

1. En tu repositorio de GitHub → pestaña **Actions**. Si pide habilitar workflows, acepta.
2. Abre **Imagen del backend** → **Run workflow** → **Run workflow**. Espera a que quede en verde (comprueba el SHA-256 de los modelos y construye la imagen).
3. Haz pública la imagen para que Azure pueda descargarla sin contraseña:
   tu perfil de GitHub → **Packages** → `sistema-detec-enferm-ia-backend` → **Package settings** → **Change visibility** → **Public**.
   Tu código sigue privado; solo la imagen es pública, y no contiene ningún secreto.

Tu imagen queda así (todo en minúsculas):

```
ghcr.io/TU_USUARIO/sistema-detec-enferm-ia-backend:latest
```

---

## 4. Azure Container Apps (backend)

### 4.1 Crear la aplicación

En https://portal.azure.com busca **Container Apps** → **Create** → **Container App**.

**Pestaña Basics**
- Subscription: tu suscripción de prueba.
- Resource group: **Create new** → `rg-fitoscan`.
- Container app name: `detector-plantas`.
- Deployment source: **Container image**.
- Region: **East US** o **Brazil South**.
- Container Apps environment: **Create new** → nombre `entorno-fitoscan`.
  - Environment type: **Consumption only**.
  - Zone redundancy: **Disabled**.
  - Pestaña **Monitoring**: Logs destination → **Don't save logs** (Log Analytics cobra aparte).
  - **Create**.

**Pestaña Container**
- Desmarca **Use quickstart image**.
- Image source: **Docker Hub or other registries**.
- Image type: **Public**.
- Registry login server: `ghcr.io`
- Image and tag: `TU_USUARIO/sistema-detec-enferm-ia-backend:latest`
- CPU and Memory: **1 CPU core, 2 Gi memory** (TensorFlow necesita al menos 2 Gi).
- Environment variables (**Source: Manual entry**):

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | tu Project URL |
| `SUPABASE_ANON_KEY` | tu anon key |
| `CORS_ORIGINS` | `http://localhost:5173` (lo cambias en el paso 6) |
| `UMBRAL_CONFIANZA` | `0.75` |

La clave `service_role` (y el Legacy JWT secret, si lo usas) **no** van aquí: se agregan como secretos en el punto 4.3.

**Pestaña Ingress**
- Ingress: **Enabled**.
- Ingress traffic: **Accepting traffic from anywhere**.
- Ingress type: **HTTP**.
- Target port: `8000`

**Review + create** → **Create**. Tarda unos minutos.

### 4.2 Escala (para no gastar créditos)

En tu Container App → **Application → Scale** (o **Scale and replicas**) → **Edit and deploy**:
- Min replicas: **0** (se apaga cuando nadie lo usa y no consume).
- Max replicas: **1** (el límite de peticiones por usuario funciona por réplica).

Guarda con **Create** (genera una revisión nueva).

### 4.3 Secretos

1. **Seguridad → Secretos → + Agregar** (en inglés: **Security → Secrets → Add**): clave `supabase-service-role`, tipo "Secreto de Container Apps", valor tu clave secreta → **Agregar**.
2. Solo si usas Legacy JWT secret: **Add** otro con nombre `supabase-jwt-secret` y ese secreto.
3. **Application → Containers → Edit and deploy** → selecciona el contenedor → **Environment variables → Add**:
   - Nombre `SUPABASE_SERVICE_ROLE_KEY`, Source **Reference a secret**, valor `supabase-service-role`.
   - (Si aplica) nombre `SUPABASE_JWT_SECRET`, Source **Reference a secret**, valor `supabase-jwt-secret`.
4. **Save** → **Create**.

Así las claves no se ven en texto plano en el portal ni en los registros.

### 4.4 Probar

En **Overview** copia **Application Url** y abre:
`https://detector-plantas.XXXX.eastus.azurecontainerapps.io/health`

La primera vez puede tardar alrededor de un minuto en arrancar porque carga TensorFlow y verifica los modelos. Debe mostrar `"integridad_verificada": true`.

Anota esa URL: es la **URL de tu backend**.

### 4.5 Alerta de gasto (recomendado)

Busca **Cost Management** → **Budgets** → **Add** → monto `10` USD → alerta al 80 % a tu correo. Así sabes si algo consume más de lo esperado.

---

## 5. Vercel (frontend)

1. En https://vercel.com → **Add New → Project** → importa `sistema-detec-enferm-ia`.
2. **Root Directory:** `frontend` · Framework: **Vite**.
3. **Environment Variables**:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | tu Project URL |
| `VITE_SUPABASE_ANON_KEY` | tu anon key |
| `VITE_API_URL` | URL de tu backend en Azure, sin `/` al final |

4. **Deploy**. Copia la URL final, por ejemplo `https://sistema-detec-enferm-ia.vercel.app`.

---

## 6. Conectar todo

Con la URL de Vercel:

1. **Supabase → Authentication → URL Configuration**
   - Site URL: tu URL de Vercel.
   - Redirect URLs: agrega `https://TU-APP.vercel.app/**`.
2. **Azure** → Container App → **Application → Containers → Edit and deploy** → contenedor → **Environment variables** → `CORS_ORIGINS` con el valor
   `https://TU-APP.vercel.app,http://localhost:5173` → **Save** → **Create**.

---

## 7. Verificar

1. Abre tu URL de Vercel, crea una cuenta, confirma el correo e inicia sesión.
2. Página **Modelo** → "Estado del servidor" debe decir **Modelo íntegro y cargado**.
3. **Diagnóstico** → sube o toma una foto y comprueba que aparece el resultado.
4. Cierra sesión y entra con la cuenta de **administrador**: en el menú aparece **Usuarios y auditoría**, con tu inicio de sesión y tu análisis ya registrados.
5. Prueba el bloqueo: intenta entrar 5 veces con una contraseña incorrecta. El sexto intento queda bloqueado 15 minutos y el panel lo muestra como **Bloqueado**.

Con **Min replicas 0**, la primera consulta después de un rato sin uso tarda alrededor de un minuto mientras el servidor arranca. Las siguientes son rápidas.

---

## Día de la presentación

- Un día antes, en Azure → **Scale**, pon **Min replicas: 1** para que no haya arranque en frío.
- Abre la URL `/health` de Azure unos minutos antes para comprobar que responde.
- Terminada la presentación, vuelve **Min replicas a 0**.

## Cuando se acaben los créditos de Azure

La prueba gratuita dura 30 días. Al terminar, Azure deshabilita la suscripción y el backend deja de responder, pero no te cobra nada si no pasaste a pago por uso. Para mantener el sistema en línea después, tienes dos opciones:
- **Azure for Students** (con correo de tu universidad): 100 USD al año, sin tarjeta. Repite el paso 4 en esa suscripción.
- **Pago por uso**: Container Apps tiene una cuota gratuita mensual; con Min replicas 0 y poco tráfico, normalmente no se supera. Mantén la alerta de gasto del punto 4.5.

## Cómo actualizar el sistema

| Cambias | Qué hacer |
|---|---|
| Frontend | `git push` → Vercel lo despliega solo |
| Backend o modelo | `git push` → GitHub construye la imagen nueva → en Azure: **Containers → Edit and deploy → Create** (descarga la nueva `latest`) |

## Limpiar la base de datos

Para borrar los datos de prueba antes de presentar, abre `database/limpiar_datos.sql` en **Supabase → SQL Editor**. Primero ejecuta la consulta de conteo y después **solo el bloque** que necesites (selecciónalo y pulsa **Run**):

| Bloque | Qué borra |
|---|---|
| A | Todos los análisis (historial) |
| B | Todo el registro de auditoría |
| C | Todos los usuarios **excepto el administrador**, con sus análisis |
| D | Un usuario concreto por su correo |

Lo borrado no se puede recuperar. Desde la aplicación nadie puede borrar análisis ni auditoría: solo se puede hacer aquí, con acceso al panel de Supabase.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Azure muestra error al descargar la imagen | La imagen sigue privada en GitHub Packages (paso 3.3) o el nombre no está en minúsculas |
| `/health` de Azure no responde o se reinicia | Memoria insuficiente: usa 2 Gi. Revisa **Monitoring → Log stream** |
| El navegador dice "CORS" en la consola | Falta la URL de Vercel en `CORS_ORIGINS` de Azure (paso 6) |
| "No se pudo conectar con el servidor" | El backend estaba apagado (Min replicas 0) y está arrancando: espera un minuto y reintenta. Si sigue, revisa **Log stream** |
| Error 401 al analizar | `SUPABASE_URL` o `SUPABASE_ANON_KEY` del backend no son del mismo proyecto que los del frontend |
| No aparece el menú de administración | Falta el punto 7 del paso 2 (`update ... set rol = 'admin'`) o el correo no coincide. Cierra sesión y vuelve a entrar |
| El panel de administración no muestra eventos | Falta `SUPABASE_SERVICE_ROLE_KEY` en Azure (punto 4.3) |
| "Demasiadas solicitudes" al iniciar sesión con muchos usuarios a la vez | Supabase limita los inicios de sesión por IP y todos pasan por el backend. Súbelo en **Authentication → Rate Limits** |
| La cámara no abre | Solo funciona con HTTPS (Vercel) o en `localhost` |

## Ejecutar todo en local

```powershell
# Terminal 1 · backend
cd backend
python -m venv venv; venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # completa los valores
uvicorn app.main:app --reload --port 8000

# Terminal 2 · frontend
cd frontend
npm install
copy .env.example .env.local   # VITE_API_URL=http://localhost:8000
npm run dev                    # http://localhost:5173
```

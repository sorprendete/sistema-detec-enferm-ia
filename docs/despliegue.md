# Despliegue completo paso a paso

Arquitectura final:

| Parte | Servicio | Costo |
|---|---|---|
| Frontend (React) | **Vercel** | Gratis, sin vencimiento |
| Backend principal (FastAPI + IA) | **Azure Container Apps** | Créditos de Azure / cuota gratuita mensual |
| Backend de respaldo (mismo código) | **Hugging Face Spaces** | Gratis, sin vencimiento |
| Base de datos y login | **Supabase** | Gratis |
| Imagen Docker del backend | **GitHub Container Registry** | Gratis |

El frontend llama primero a Azure. Si Azure no responde en 20 segundos, da un error de servidor (502, 503 o 504) o se acaban los créditos, repite la petición en Hugging Face automáticamente. El resultado del diagnóstico indica qué servidor lo atendió.

Orden de los pasos: **1) GitHub → 2) Supabase → 3) Hugging Face → 4) Imagen Docker → 5) Azure → 6) Vercel → 7) Conectar todo → 8) Verificar**.

---

## 0. Antes de empezar

Cuentas que necesitas (todas gratis): GitHub, Supabase, Hugging Face, Vercel y Azure (ya la tienes).

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
2. En la terminal, primero coloca el workflow que construye la imagen Docker en la carpeta que GitHub reconoce:

```powershell
mkdir .github\workflows
move despliegue\imagen-backend.yml .github\workflows\
```

3. Luego inicializa el repositorio:

```powershell
git lfs install
git init -b main
git add .
git status
```

4. **Revisa la lista de `git status`**: no debe aparecer ningún `.env` ni `.env.local` (el `.gitignore` ya los excluye). Si aparece alguno, no sigas y avísame.
5. Sube el código:

```powershell
git commit -m "Sistema de detección de enfermedades en plantas"
git remote add origin https://github.com/TU_USUARIO/sistema-detec-enferm-ia.git
git push -u origin main
```

Los modelos `.keras` se suben con Git LFS (configurado en `.gitattributes`).

---

## 2. Supabase (base de datos y login)

Si ya creaste tu proyecto y ejecutaste los SQL cuando probaste en local, salta al punto 4.

1. En https://supabase.com crea un proyecto (región São Paulo).
2. **SQL Editor → New query**: ejecuta `database/schema.sql` y después `database/politicas_rls.sql`.
3. **Authentication → Sign In / Providers → Email**: deja activado "Confirm email".
4. **Project Settings → API**: copia *Project URL* y la *anon public key*.
5. **Project Settings → JWT Keys**: si la clave activa es "Legacy JWT secret", copia ese secreto. Si usa claves ECC/RSA, no necesitas nada.

Anota estos valores. Los vas a usar en Hugging Face, Azure y Vercel:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=         (vacío si no es Legacy)
```

---

## 3. Hugging Face Spaces (backend de respaldo)

1. En https://huggingface.co → **Settings → Access Tokens** → crea un token tipo **Write**.
2. **New Space** → nombre `detector-plantas` → SDK **Docker** → plantilla **Blank** → hardware **CPU basic (free)** → **Public**.
3. En tu terminal, sube la carpeta `backend` **sin** tu `.env` ni el entorno virtual:

```powershell
pip install -U huggingface_hub
hf auth login
hf upload TU_USUARIO/detector-plantas .\backend . --repo-type=space --exclude ".env" --exclude "venv/*" --exclude ".venv/*" --exclude "**/__pycache__/*" --exclude "tests/*"
```

4. En el Space → **Settings → Variables and secrets** → **New secret**, crea:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | tu Project URL |
| `SUPABASE_ANON_KEY` | tu anon key |
| `SUPABASE_JWT_SECRET` | solo si es Legacy |
| `CORS_ORIGINS` | `http://localhost:5173` (lo cambias en el paso 7) |
| `UMBRAL_CONFIANZA` | `0.75` |

5. Espera a que el Space diga **Running** (la primera vez tarda varios minutos) y abre:
   `https://TU_USUARIO-detector-plantas.hf.space/health`
   Debe mostrar `"integridad_verificada": true`.

Anota esa URL: es tu **URL de respaldo**.

---

## 4. Imagen Docker del backend (para Azure)

Azure necesita una imagen Docker ya construida. El archivo `.github/workflows/imagen-backend.yml` (que moviste en el paso 1), que la construye gratis en GitHub cada vez que cambias `backend/`.

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

## 5. Azure Container Apps (backend principal)

### 5.1 Crear la aplicación

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
| `CORS_ORIGINS` | `http://localhost:5173` (lo cambias en el paso 7) |
| `UMBRAL_CONFIANZA` | `0.75` |

Si usas Legacy JWT secret, agrégalo después como secreto (punto 5.3), no aquí.

**Pestaña Ingress**
- Ingress: **Enabled**.
- Ingress traffic: **Accepting traffic from anywhere**.
- Ingress type: **HTTP**.
- Target port: `7860`

**Review + create** → **Create**. Tarda unos minutos.

### 5.2 Escala (para no gastar créditos)

En tu Container App → **Application → Scale** (o **Scale and replicas**) → **Edit and deploy**:
- Min replicas: **0** (se apaga cuando nadie lo usa y no consume).
- Max replicas: **1** (el límite de peticiones por usuario funciona por réplica).

Guarda con **Create** (genera una revisión nueva).

### 5.3 Secreto JWT (solo si usas Legacy JWT secret)

1. **Settings → Secrets → Add**: nombre `supabase-jwt-secret`, valor tu secreto → **Add**.
2. **Application → Containers → Edit and deploy** → selecciona el contenedor → **Environment variables → Add**: nombre `SUPABASE_JWT_SECRET`, Source **Reference a secret**, valor `supabase-jwt-secret` → **Save** → **Create**.

### 5.4 Probar

En **Overview** copia **Application Url** y abre:
`https://detector-plantas.XXXX.eastus.azurecontainerapps.io/health`

La primera vez puede tardar alrededor de un minuto en arrancar porque carga TensorFlow y verifica los modelos. Debe mostrar `"integridad_verificada": true`.

Anota esa URL: es tu **URL principal**.

### 5.5 Alerta de gasto (recomendado)

Busca **Cost Management** → **Budgets** → **Add** → monto `10` USD → alerta al 80 % a tu correo. Así sabes si algo consume más de lo esperado.

---

## 6. Vercel (frontend)

1. En https://vercel.com → **Add New → Project** → importa `sistema-detec-enferm-ia`.
2. **Root Directory:** `frontend` · Framework: **Vite**.
3. **Environment Variables**:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | tu Project URL |
| `VITE_SUPABASE_ANON_KEY` | tu anon key |
| `VITE_API_URL` | URL principal (Azure) |
| `VITE_API_URL_RESPALDO` | URL de respaldo (Hugging Face) |

Las URLs van sin `/` al final.

4. **Deploy**. Copia la URL final, por ejemplo `https://sistema-detec-enferm-ia.vercel.app`.

---

## 7. Conectar todo

Con la URL de Vercel:

1. **Supabase → Authentication → URL Configuration**
   - Site URL: tu URL de Vercel.
   - Redirect URLs: agrega `https://TU-APP.vercel.app/**`.
2. **Hugging Face** → Space → Settings → Variables and secrets → edita `CORS_ORIGINS`:
   `https://TU-APP.vercel.app,http://localhost:5173` → el Space se reinicia solo.
3. **Azure** → Container App → **Application → Containers → Edit and deploy** → contenedor → **Environment variables** → `CORS_ORIGINS` con el mismo valor → **Save** → **Create**.

---

## 8. Verificar

1. Abre tu URL de Vercel, crea una cuenta, confirma el correo e inicia sesión.
2. Página **Modelo** → "Estado del servidor" debe decir **Modelo íntegro y cargado** y **Responde: Servidor principal**.
3. **Diagnóstico** → sube o toma una foto. En "Datos de seguridad y trazabilidad" verás **Atendido por: Servidor principal**.
4. **Prueba del respaldo**: en Azure → Container App → **Overview → Stop**. Vuelve a analizar una foto: ahora dirá **Atendido por: Servidor de respaldo**. Después pulsa **Start** en Azure.

Si el principal falla, el sistema usa el respaldo durante 5 minutos y luego vuelve a probar el principal.

---

## Día de la presentación

- Un día antes, en Azure → **Scale**, pon **Min replicas: 1** para que no haya arranque en frío.
- Abre la URL `/health` de Azure y de Hugging Face unos minutos antes, para despertarlos.
- Terminada la presentación, vuelve **Min replicas a 0**.

## Cuando se acaben los créditos de Azure

Azure deshabilita la suscripción y no te cobra nada si no pasaste a pago por uso. El sistema sigue funcionando solo con Hugging Face, sin que cambies nada: el frontend pasa al respaldo automáticamente.

## Cómo actualizar el sistema

| Cambias | Qué hacer |
|---|---|
| Frontend | `git push` → Vercel lo despliega solo |
| Backend o modelo | `git push` → GitHub construye la imagen nueva → en Azure: **Containers → Edit and deploy → Create** (descarga la nueva `latest`) → repite el `hf upload` del paso 3 |

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Azure muestra error al descargar la imagen | La imagen sigue privada en GitHub Packages (paso 4.3) o el nombre no está en minúsculas |
| `/health` de Azure no responde o se reinicia | Memoria insuficiente: usa 2 Gi. Revisa **Monitoring → Log stream** |
| El navegador dice "CORS" en la consola | Falta la URL de Vercel en `CORS_ORIGINS` de Azure o de Hugging Face (paso 7) |
| "No se pudo conectar con el servidor" | Ambos backends están dormidos o caídos: abre sus `/health` y espera |
| Error 401 al analizar | `SUPABASE_URL` o `SUPABASE_ANON_KEY` del backend no son del mismo proyecto que los del frontend |
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
copy .env.example .env.local   # VITE_API_URL=http://localhost:8000 y borra VITE_API_URL_RESPALDO
npm run dev                    # http://localhost:5173
```

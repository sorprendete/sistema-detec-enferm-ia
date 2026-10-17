# Seguridad de FitoScan: riesgos, amenazas y análisis de logs

Este documento reúne el análisis de seguridad del sistema con los conceptos del curso:
activos, amenazas, vulnerabilidades, triada CIA, matriz de riesgos (probabilidad × impacto),
controles y detección de amenazas con Machine Learning.

Todo se puede ver en la aplicación en **Administración → Amenazas y riesgos**.

## 1. Activos

| Activo | Por qué es valioso |
|---|---|
| Modelo de IA (`modelo_plantas.keras`, `filtro_cultivos.keras`) | Si se altera, el sistema da diagnósticos falsos |
| Cuentas de usuario y del administrador | Dan acceso al historial y al panel de administración |
| Historial de diagnósticos | Datos de cada agricultor |
| Clave secreta de Supabase | Permite leer y escribir toda la base de datos |
| Servicio de diagnóstico (API en Azure) | Debe estar disponible cuando el agricultor lo necesita |
| Registro de auditoría | Evidencia de lo que pasó en el sistema |

## 2. Triada CIA en el sistema

| Pilar | Cómo se protege |
|---|---|
| **Confidencialidad** | JWT de Supabase en cada petición, Row Level Security (cada usuario ve solo lo suyo), rol de administrador comprobado en el servidor, secretos solo en `.env` y Azure, HTTPS con HSTS |
| **Integridad** | SHA-256 del modelo y del filtro verificado antes de cargarlos, SHA-256 de cada imagen analizada, validación de archivos por firma binaria, auditoría que nadie puede editar ni borrar |
| **Disponibilidad** | Límite de peticiones por usuario, `/health` para monitoreo, escalado de réplicas en Azure, imagen del contenedor reconstruible desde GitHub |

## 3. Matriz de riesgos

**Riesgo = Probabilidad × Impacto** (escala de 1 a 5). Nivel: 15 o más **ALTO**, de 8 a 14 **MEDIO**, menos de 8 **BAJO**.
El riesgo *inherente* es sin controles; el *residual*, con los controles que ya tiene FitoScan.

| ID | Riesgo | Pilar | Inherente | Controles en FitoScan | Residual |
|---|---|---|---|---|---|
| R1 | Fuerza bruta o prueba de contraseñas contra las cuentas | C | 4×4 = 16 ALTO | Política de contraseñas, bloqueo de 15 min tras 5 fallos, auditoría, detector con ML | 8 MEDIO |
| R2 | Reemplazo o alteración del modelo | I | 3×5 = 15 ALTO | SHA-256 antes de cargar, modelo en solo lectura, imagen construida por GitHub Actions | 5 BAJO |
| R3 | Filtración de la clave secreta de Supabase | C | 3×5 = 15 ALTO | Solo en `.env` y secretos de Azure, `.env` fuera de Git, nunca en el navegador | 10 MEDIO |
| R4 | Un usuario ve o modifica datos de otro (OWASP A01) | C | 3×4 = 12 MEDIO | Row Level Security, JWT verificado, rol comprobado en el servidor | 4 BAJO |
| R5 | Archivo malicioso disfrazado de imagen | I | 3×4 = 12 MEDIO | Firma binaria, límite de 5 MB y 25 megapíxeles, contenedor sin privilegios | 4 BAJO |
| R7 | Diagnóstico erróneo (falso positivo) | I | 4×3 = 12 MEDIO | Filtro de cultivo, nivel de exigencia, aviso de baja certeza | 6 BAJO |
| R10 | Phishing o ingeniería social al administrador | C | 3×4 = 12 MEDIO | Un único administrador, acciones auditadas | 9 MEDIO |
| R6 | Saturación del servicio (DoS) | D | 3×3 = 9 MEDIO | 20 análisis por minuto por usuario, solo usuarios autenticados, escalado en Azure | 6 BAJO |
| R12 | Librería con una vulnerabilidad conocida | I | 3×3 = 9 MEDIO | Versiones fijadas, imagen reconstruida en cada cambio | 6 BAJO |
| R9 | Pérdida de datos por borrado o falla | D | 2×4 = 8 MEDIO | Código y modelos en GitHub, esquema en `database/*.sql` | 8 MEDIO |
| R11 | Interceptación del tráfico | C | 2×4 = 8 MEDIO | HTTPS, HSTS, CORS limitado | 4 BAJO |
| R8 | Sondeo del modelo con imágenes manipuladas | I | 2×3 = 6 BAJO | Auditoría de cada análisis, detector con ML, límite de peticiones | 4 BAJO |

**Resultado:** sin controles hay 3 riesgos altos, 8 medios y 1 bajo; con los controles actuales quedan 0 altos, 4 medios y 8 bajos.

Pendientes para bajar el riesgo residual (tratamiento: mitigar):

1. Activar MFA (TOTP) en Supabase, obligatorio para el administrador (R1, R10).
2. Rotar la clave secreta de Supabase si alguna vez se compartió (R3).
3. Respaldo semanal de la base de datos con `pg_dump`, guardado fuera de Supabase (R9).
4. Firewall de aplicaciones (WAF) delante de la API (R6).
5. Activar Dependabot en GitHub (R12).

Los datos están en `seguridad/riesgos.json`. Para regenerar la tabla y el gráfico:

```
python seguridad/matriz_riesgos.py
```

Genera `reporte_seguridad/matriz_riesgos.csv` y `matriz_riesgos.png` (las dos matrices 5×5). Si editas `riesgos.json`, ejecuta con `--sincronizar` para que la página de Administración muestre los cambios.

## 4. Controles por tipo

| Preventivos | Detectivos | Correctivos |
|---|---|---|
| Política de contraseñas, bloqueo por fuerza bruta, límite de peticiones, validación de archivos, RLS, roles, CORS, HTTPS | Auditoría con IP y navegador, detector de amenazas con ML, analizador de logs, `/health` | El servidor no arranca si el hash del modelo no coincide, desactivar cuentas desde Administración, reconstruir la imagen desde GitHub |

## 5. Detección de amenazas con Machine Learning

Las reglas fijas solo detectan lo que describen. Por ejemplo, "5 contraseñas fallidas" no detecta a quien prueba 4 contraseñas en 50 cuentas distintas. Por eso el sistema combina dos enfoques (`backend/app/services/amenazas.py`).

**Reglas por umbral:**

- 5 o más contraseñas fallidas desde una IP: fuerza bruta.
- 5 o más cuentas probadas con mayoría de fallos.
- 10 o más imágenes rechazadas: sondeo del modelo.
- 20 o más eventos en un minuto.
- 3 o más cuentas creadas.
- Un cliente que no es un navegador (script o herramienta).

**Isolation Forest (aprendizaje no supervisado, scikit-learn):**

1. Resume cada IP de la auditoría en 11 números: eventos, contraseñas fallidas, proporción de fallos, cuentas distintas, bloqueos, imágenes rechazadas, proporción de rechazos, eventos en un mismo minuto, actividad de madrugada, cliente automatizado y cuentas creadas.
2. Los estandariza y entrena 300 árboles que intentan aislar cada IP con cortes al azar. Una IP rara se aísla con pocos cortes.
3. Convierte eso en un puntaje de 0 a 100. Por encima de 55 la IP es anómala, y el informe dice en qué se aleja de lo normal (por ejemplo, "cuentas distintas usadas: 4, lo normal: 1").

No necesita ejemplos de ataques ni etiquetas. Se entrena en milisegundos cada vez que se ejecuta el análisis, con los datos más recientes, y no guarda ningún archivo de modelo. Con menos de 10 IPs distintas no hay suficiente "normalidad" para aprender y solo se aplican las reglas.

**Nivel de la alerta:** alto si incumple una regla grave, o si una regla y el modelo coinciden; medio si solo una de las dos la marca.

### Tráfico simulado

Para la demostración (y las pruebas), `backend/app/services/simulacion.py` genera una semana de uso de 40 agricultores con 5 ataques. No escribe nada en la base de datos.

| Ataque | Lo detecta |
|---|---|
| Fuerza bruta contra una cuenta, de madrugada | Reglas y modelo |
| Prueba de contraseñas en 28 cuentas con `python-requests` | Reglas y modelo |
| Sondeo del modelo con 60 imágenes que no son hojas | Reglas y modelo |
| Creación de 6 cuentas desde una IP | Reglas y modelo |
| Una IP que entra con éxito a 4 cuentas distintas a las 3 a. m. | **Solo el modelo**: no hay fallos y son menos de 5 cuentas, así que ninguna regla salta |

En la aplicación: **Administración → Amenazas y riesgos → Tráfico simulado**.

## 6. Analizador de logs (script)

`seguridad/analizar_auditoria.py` es el mini proyecto de la sesión de ciberseguridad aplicado a FitoScan. Sigue la estructura recomendada: parámetros, lectura, análisis y reporte.

```
python seguridad/analizar_auditoria.py --simular
python seguridad/analizar_auditoria.py --log auditoria_fitoscan.csv --umbral 5
```

- **Entrada:** el CSV de **Administración → Registro de auditoría → Exportar CSV**, o tráfico simulado. El archivo original no se modifica.
- **Análisis:**
  - Expresiones regulares para extraer IPs, correos y URLs.
  - `Counter` de intentos fallidos por IP con su umbral (`--umbral`).
  - El mismo detector con Isolation Forest que usa la aplicación.
- **Salidas** en `reporte_seguridad/`:

| Archivo | Contenido |
|---|---|
| `alertas.csv` | IP, nivel, puntaje del modelo, reglas, motivo y recomendación |
| `indicadores.txt` | IPs, correos y URLs encontrados, sin duplicados |
| `reporte.json` | Informe completo con fecha, fuente y severidad |
| `puntajes.png` | Gráfico de las IPs más anómalas con el umbral |
| `manifiesto_hashes.csv` | SHA-256 de la entrada y de cada salida, para comprobar que la evidencia no se alteró |

Requisitos: `pip install scikit-learn numpy matplotlib` (matplotlib es opcional, solo para los gráficos).

# Imagen del backend para Azure Container Apps (puerto 8000).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    PIP_NO_CACHE_DIR=1

# Usuario sin privilegios (buena práctica de seguridad)
RUN useradd -m -u 1000 app
WORKDIR /home/app/api

COPY --chown=app requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY --chown=app app ./app
COPY --chown=app modelo ./modelo

# Los archivos del modelo quedan en solo lectura dentro del contenedor
RUN chmod -R a-w ./modelo

USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]

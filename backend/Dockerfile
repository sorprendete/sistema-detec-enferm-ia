# Imagen para Hugging Face Spaces (SDK Docker). El Space expone el puerto 7860.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    PIP_NO_CACHE_DIR=1

# Usuario sin privilegios (requisito de buenas prácticas y de HF Spaces)
RUN useradd -m -u 1000 app
WORKDIR /home/app/api

COPY --chown=app requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY --chown=app app ./app
COPY --chown=app modelo ./modelo

# Los archivos del modelo quedan en solo lectura dentro del contenedor
RUN chmod -R a-w ./modelo

USER app
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers"]

"""Detección de amenazas en la auditoría: reglas por umbral + Isolation Forest."""
from app.services import amenazas, simulacion


def _por_ip(informe):
    return {r["ip"]: r for r in informe["ips"]}


def test_detecta_los_ataques_simulados():
    informe = amenazas.analizar(simulacion.generar())
    ips = _por_ip(informe)
    assert informe["modelo"]["entrenado"]
    assert ips[simulacion.IP_FUERZA_BRUTA]["nivel"] == "alto"
    assert ips[simulacion.IP_SPRAYING]["nivel"] == "alto"
    assert ips[simulacion.IP_SONDEO]["nivel"] == "alto"
    assert ips[simulacion.IP_REGISTROS]["nivel"] in ("alto", "medio")
    tipos = {h["tipo"] for h in ips[simulacion.IP_SPRAYING]["reglas"]}
    assert {"Prueba de contraseñas en muchas cuentas", "Cliente automatizado"} <= tipos


def test_el_modelo_detecta_lo_que_ninguna_regla_ve():
    # 4 cuentas distintas con éxito, de madrugada: ninguna regla salta, el modelo sí
    fila = _por_ip(amenazas.analizar(simulacion.generar()))[simulacion.IP_CUENTAS_COMPARTIDAS]
    assert fila["reglas"] == [] and fila["anomalia_ml"] and fila["solo_ml"]
    assert any("madrugada" in t or "cuentas distintas" in t for t in fila["explicacion"])


def test_pocos_falsos_positivos_en_usuarios_normales():
    informe = amenazas.analizar(simulacion.generar())
    atacantes = {simulacion.IP_FUERZA_BRUTA, simulacion.IP_SPRAYING, simulacion.IP_SONDEO,
                 simulacion.IP_REGISTROS, simulacion.IP_CUENTAS_COMPARTIDAS}
    normales = [r for r in informe["ips"] if r["ip"] not in atacantes]
    assert sum(r["nivel"] != "normal" for r in normales) <= 1


def test_con_poco_historial_solo_usa_reglas():
    eventos = [{"fecha": "2026-10-01T10:00:00+00:00", "accion": "login", "estado": "fallo",
                "email": "a@b.com", "ip": "1.1.1.1", "agente": "curl/8.0", "detalle": None}] * 6
    informe = amenazas.analizar(eventos)
    assert not informe["modelo"]["entrenado"] and informe["modelo"]["motivo"]
    fila = informe["ips"][0]
    assert fila["nivel"] == "alto" and not fila["anomalia_ml"]
    assert {h["tipo"] for h in fila["reglas"]} >= {"Fuerza bruta", "Cliente automatizado"}


def test_sin_eventos():
    informe = amenazas.analizar([])
    assert informe["ips"] == [] and informe["resumen"]["ips"] == 0

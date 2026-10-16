"""El modelo solo debe cargarse si su SHA-256 coincide con el registrado."""
import hashlib
from pathlib import Path

import pytest

from app.security.integridad import ModeloAlteradoError, calcular_sha256, verificar_integridad

MODELO = Path(__file__).resolve().parent.parent / "modelo"


def test_modelo_real_es_integro():
    sha = verificar_integridad(MODELO / "modelo_plantas.keras", MODELO / "modelo_hash.txt")
    assert len(sha) == 64


def test_filtro_de_cultivo_es_integro():
    sha = verificar_integridad(MODELO / "filtro_cultivos.keras", MODELO / "filtro_hash.txt")
    assert len(sha) == 64


def test_modelo_alterado_se_rechaza(tmp_path):
    original = (MODELO / "modelo_plantas.keras").read_bytes()
    alterado = tmp_path / "modelo.keras"
    alterado.write_bytes(original[:-1] + bytes([original[-1] ^ 0xFF]))  # cambia 1 byte
    hash_txt = tmp_path / "hash.txt"
    hash_txt.write_text((MODELO / "modelo_hash.txt").read_text())

    with pytest.raises(ModeloAlteradoError):
        verificar_integridad(alterado, hash_txt)


def test_hash_invalido_se_rechaza(tmp_path):
    f = tmp_path / "m.keras"
    f.write_bytes(b"abc")
    h = tmp_path / "h.txt"
    h.write_text("no-es-un-hash")
    with pytest.raises(ModeloAlteradoError):
        verificar_integridad(f, h)


def test_acepta_formato_sha256sum(tmp_path):
    f = tmp_path / "m.keras"
    f.write_bytes(b"contenido")
    h = tmp_path / "h.txt"
    h.write_text(f"{hashlib.sha256(b'contenido').hexdigest()}  m.keras\n")
    assert verificar_integridad(f, h) == calcular_sha256(f)

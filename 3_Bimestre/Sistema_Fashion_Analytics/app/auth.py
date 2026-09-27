import hashlib
import hmac
import os

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import models

PAPEL_ADMIN = "admin"
PAPEL_ASSISTENTE = "assistente"

SESSAO_CHAVE_USUARIO = "usuario"

_ITERACOES_PBKDF2 = 200_000


def gerar_hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    hash_bytes = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, _ITERACOES_PBKDF2)
    return f"{salt.hex()}${hash_bytes.hex()}"


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
    try:
        salt_hex, hash_hex = hash_armazenado.split("$", 1)
        salt = bytes.fromhex(salt_hex)
    except ValueError:
        return False
    hash_calculado = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, _ITERACOES_PBKDF2)
    return hmac.compare_digest(hash_calculado.hex(), hash_hex)


def autenticar(db: Session, login: str, senha: str) -> models.Usuario | None:
    usuario = db.query(models.Usuario).filter(models.Usuario.login == login).first()
    if not usuario or not verificar_senha(senha, usuario.senha_hash):
        return None
    return usuario


def obter_usuario_sessao(request: Request) -> dict | None:
    return request.session.get(SESSAO_CHAVE_USUARIO)


def exigir_login(request: Request) -> dict:
    usuario = obter_usuario_sessao(request)
    if not usuario:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return usuario


def exigir_admin(usuario: dict = Depends(exigir_login)) -> dict:
    if usuario.get("papel") != PAPEL_ADMIN:
        raise HTTPException(status_code=403, detail="Ação restrita ao administrador")
    return usuario

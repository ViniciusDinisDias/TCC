import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app import auth, models
from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def sobrescrever_get_db():
        yield db_session

    app.dependency_overrides[get_db] = sobrescrever_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _criar_usuario(db_session, login, senha, papel):
    usuario = models.Usuario(login=login, senha_hash=auth.gerar_hash_senha(senha), papel=papel)
    db_session.add(usuario)
    db_session.commit()
    return usuario


@pytest.fixture
def client_admin(client, db_session):
    _criar_usuario(db_session, "admin_teste", "senha123", auth.PAPEL_ADMIN)
    client.post("/login", data={"login": "admin_teste", "senha": "senha123"})
    return client


@pytest.fixture
def client_assistente(client, db_session):
    _criar_usuario(db_session, "assistente_teste", "senha123", auth.PAPEL_ASSISTENTE)
    client.post("/login", data={"login": "assistente_teste", "senha": "senha123"})
    return client

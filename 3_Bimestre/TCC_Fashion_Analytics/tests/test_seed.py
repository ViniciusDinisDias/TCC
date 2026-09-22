from datetime import datetime, timedelta

from app import auth, models
from seed import PRODUTOS_SEED, popular_pedidos, popular_produtos, popular_usuarios


def test_seed_cria_produtos_e_pedidos(db_session):
    produtos = popular_produtos(db_session)
    assert len(produtos) == len(PRODUTOS_SEED)

    popular_pedidos(db_session, produtos)

    assert db_session.query(models.Pedido).count() > 0

    produto_parado = db_session.query(models.Produto).filter_by(sku="VES-004").first()
    tem_pedido = (
        db_session.query(models.ItemPedido)
        .filter(models.ItemPedido.produto_id == produto_parado.id)
        .first()
    )
    assert tem_pedido is None

    produto_queda = db_session.query(models.Produto).filter_by(sku="SAI-001").first()
    itens_queda = (
        db_session.query(models.ItemPedido)
        .join(models.Pedido)
        .filter(models.ItemPedido.produto_id == produto_queda.id)
        .all()
    )
    assert len(itens_queda) > 0
    limite_recente = datetime.utcnow() - timedelta(days=20)
    assert all(item.pedido.data_pedido < limite_recente for item in itens_queda)


def test_popular_usuarios_cria_admin_e_assistente(db_session, monkeypatch):
    monkeypatch.setenv("SEED_SENHA_ADMIN", "senhaAdminTeste")
    monkeypatch.setenv("SEED_SENHA_ASSISTENTE", "senhaAssistenteTeste")

    popular_usuarios(db_session)

    admin = db_session.query(models.Usuario).filter_by(login="admin").first()
    assistente = db_session.query(models.Usuario).filter_by(login="assistente").first()
    assert admin.papel == auth.PAPEL_ADMIN
    assert assistente.papel == auth.PAPEL_ASSISTENTE
    assert auth.verificar_senha("senhaAdminTeste", admin.senha_hash)


def test_popular_usuarios_nao_duplica_se_ja_existir(db_session):
    popular_usuarios(db_session)
    popular_usuarios(db_session)

    assert db_session.query(models.Usuario).count() == 2

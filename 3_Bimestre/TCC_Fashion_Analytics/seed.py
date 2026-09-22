"""Popula o banco de dados com produtos e pedidos de exemplo para demonstração."""
import os
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import auth, models
from app.database import Base, SessionLocal, engine

random.seed(42)

PRODUTOS_SEED = [
    {"sku": "BLU-001", "nome": "Blusa Cropped Básica", "categoria": "Blusa", "tamanho": "P", "cor": "Preto", "preco": 49.90, "quantidade_estoque": 30, "estoque_minimo": 5},
    {"sku": "BLU-002", "nome": "Blusa Ciganinha", "categoria": "Blusa", "tamanho": "M", "cor": "Branco", "preco": 59.90, "quantidade_estoque": 25, "estoque_minimo": 5},
    {"sku": "VES-001", "nome": "Vestido Midi Floral", "categoria": "Vestido", "tamanho": "M", "cor": "Rosa", "preco": 129.90, "quantidade_estoque": 15, "estoque_minimo": 4},
    {"sku": "VES-002", "nome": "Vestido Longo Festa", "categoria": "Vestido", "tamanho": "G", "cor": "Vermelho", "preco": 189.90, "quantidade_estoque": 8, "estoque_minimo": 3},
    {"sku": "SAI-001", "nome": "Saia Jeans", "categoria": "Saia", "tamanho": "M", "cor": "Azul", "preco": 79.90, "quantidade_estoque": 20, "estoque_minimo": 5},
    {"sku": "SAI-002", "nome": "Saia Plissada", "categoria": "Saia", "tamanho": "P", "cor": "Preto", "preco": 69.90, "quantidade_estoque": 18, "estoque_minimo": 5},
    {"sku": "CAL-001", "nome": "Calça Wide Leg", "categoria": "Calça", "tamanho": "M", "cor": "Branco", "preco": 99.90, "quantidade_estoque": 22, "estoque_minimo": 5},
    {"sku": "CAL-002", "nome": "Calça Alfaiataria", "categoria": "Calça", "tamanho": "G", "cor": "Preto", "preco": 109.90, "quantidade_estoque": 3, "estoque_minimo": 5},
    {"sku": "SHO-001", "nome": "Short Jeans", "categoria": "Short", "tamanho": "P", "cor": "Azul", "preco": 59.90, "quantidade_estoque": 26, "estoque_minimo": 5},
    {"sku": "SHO-002", "nome": "Short Alfaiataria", "categoria": "Short", "tamanho": "M", "cor": "Vermelho", "preco": 64.90, "quantidade_estoque": 14, "estoque_minimo": 5},
    {"sku": "BLU-003", "nome": "Blusa Manga Longa", "categoria": "Blusa", "tamanho": "G", "cor": "Rosa", "preco": 54.90, "quantidade_estoque": 19, "estoque_minimo": 5},
    {"sku": "VES-003", "nome": "Vestido Curto Casual", "categoria": "Vestido", "tamanho": "P", "cor": "Branco", "preco": 89.90, "quantidade_estoque": 17, "estoque_minimo": 5},
    {"sku": "SAI-003", "nome": "Saia Lápis", "categoria": "Saia", "tamanho": "M", "cor": "Vermelho", "preco": 74.90, "quantidade_estoque": 21, "estoque_minimo": 5},
    {"sku": "CAL-003", "nome": "Calça Legging", "categoria": "Calça", "tamanho": "P", "cor": "Preto", "preco": 44.90, "quantidade_estoque": 28, "estoque_minimo": 5},
    {"sku": "SHO-003", "nome": "Short Moletom", "categoria": "Short", "tamanho": "G", "cor": "Azul", "preco": 39.90, "quantidade_estoque": 24, "estoque_minimo": 5},
    # Produto propositalmente parado: estoque disponível, sem nenhuma venda recente
    {"sku": "VES-004", "nome": "Vestido Inverno Tricot", "categoria": "Vestido", "tamanho": "M", "cor": "Preto", "preco": 149.90, "quantidade_estoque": 12, "estoque_minimo": 3},
]

NOMES_CLIENTES = [
    "Ana Souza", "Beatriz Lima", "Carla Mendes", "Daniela Rocha", "Elisa Santos",
    "Fernanda Alves", "Gabriela Reis", "Helena Costa", "Isabela Martins", "Julia Ferreira",
]


def popular_produtos(db: Session) -> list:
    produtos = [models.Produto(**dados) for dados in PRODUTOS_SEED]
    db.add_all(produtos)
    db.commit()
    for produto in produtos:
        db.refresh(produto)
    return produtos


def _criar_pedido(db: Session, canal: str, cliente_nome: str, dias_atras: int, itens: list) -> models.Pedido:
    """itens: lista de tuplas (produto, quantidade)."""
    data_pedido = datetime.utcnow() - timedelta(days=dias_atras)
    pedido = models.Pedido(
        canal=canal, cliente_nome=cliente_nome, cliente_contato="11999990000",
        status="entregue", data_pedido=data_pedido, valor_total=0.0, criado_em=data_pedido,
    )
    db.add(pedido)
    db.flush()

    valor_total = 0.0
    for produto, quantidade in itens:
        subtotal = produto.preco * quantidade
        db.add(models.ItemPedido(
            pedido_id=pedido.id, produto_id=produto.id,
            quantidade=quantidade, preco_unitario=produto.preco, subtotal=subtotal,
        ))
        produto.quantidade_estoque = max(produto.quantidade_estoque - quantidade, 0)
        valor_total += subtotal

    pedido.valor_total = valor_total
    db.commit()
    return pedido


def popular_pedidos(db: Session, produtos: list) -> None:
    produtos_por_sku = {p.sku: p for p in produtos}

    # Produto com queda brusca de vendas: vendas concentradas entre 42 e 55 dias atrás, nada recente
    produto_queda = produtos_por_sku["SAI-001"]
    for dias in [55, 52, 48, 45, 42]:
        canal = random.choice(["loja_fisica", "shopee"])
        _criar_pedido(db, canal, random.choice(NOMES_CLIENTES), dias, [(produto_queda, random.randint(2, 4))])

    # Pedidos variados nos últimos 35 dias, para os demais produtos (exceto o parado e o de queda)
    produtos_ativos = [p for p in produtos if p.sku not in ("VES-004", "SAI-001")]
    for _ in range(35):
        dias_atras = random.randint(0, 35)
        canal = random.choice(["loja_fisica", "shopee"])
        cliente = random.choice(NOMES_CLIENTES)
        itens = [
            (produto, random.randint(1, 3))
            for produto in random.sample(produtos_ativos, k=random.randint(1, 2))
        ]
        _criar_pedido(db, canal, cliente, dias_atras, itens)


def popular_usuarios(db: Session) -> None:
    if db.query(models.Usuario).first():
        return
    senha_admin = os.environ.get("SEED_SENHA_ADMIN", "admin123")
    senha_assistente = os.environ.get("SEED_SENHA_ASSISTENTE", "assistente123")
    db.add(models.Usuario(login="admin", senha_hash=auth.gerar_hash_senha(senha_admin), papel=auth.PAPEL_ADMIN))
    db.add(models.Usuario(login="assistente", senha_hash=auth.gerar_hash_senha(senha_assistente), papel=auth.PAPEL_ASSISTENTE))
    db.commit()
    print("Usuários padrão criados: admin/assistente (troque as senhas em produção).")


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        popular_usuarios(db)
        if db.query(models.Produto).first():
            print("Banco já contém dados de produtos. Nenhuma alteração feita.")
            return
        produtos = popular_produtos(db)
        popular_pedidos(db, produtos)
        print(f"Seed concluído: {len(produtos)} produtos e {db.query(models.Pedido).count()} pedidos criados.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

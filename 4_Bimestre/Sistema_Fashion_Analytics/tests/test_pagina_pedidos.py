def test_pagina_pedidos_carrega(client_admin):
    resposta = client_admin.get("/pedidos-page")
    assert resposta.status_code == 200
    assert "form-pedido" in resposta.text
    assert "busca-pedido" in resposta.text
    assert "grade-pedidos" in resposta.text
    assert "botao-novo-pedido" in resposta.text


def test_pedidos_js_disponivel(client_admin):
    resposta = client_admin.get("/static/js/pedidos.js")
    assert resposta.status_code == 200
    assert "carregarPedidos" in resposta.text
    assert "filtrarPedidos" in resposta.text
    assert "opcoesStatusPara" in resposta.text


def test_status_por_canal_cobre_loja_fisica_e_shopee(client_admin):
    resposta = client_admin.get("/static/js/pedidos.js")
    assert resposta.status_code == 200
    assert '"vendido", "reservado"' in resposta.text
    assert '"pendente", "cancelado", "enviado", "entregue"' in resposta.text


def test_pedidos_js_usa_modal_de_confirmacao_para_excluir(client_admin):
    resposta = client_admin.get("/static/js/pedidos.js")
    assert resposta.status_code == 200
    assert "confirmarAcao(" in resposta.text
    assert "confirm(" not in resposta.text

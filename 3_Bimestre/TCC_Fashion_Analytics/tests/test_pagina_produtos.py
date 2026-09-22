def test_pagina_produtos_carrega(client_admin):
    resposta = client_admin.get("/produtos-page")
    assert resposta.status_code == 200
    assert "form-produto" in resposta.text
    assert "Fama Fashion" in resposta.text
    assert "busca-produto" in resposta.text
    assert "grade-produtos" in resposta.text
    assert "botao-novo-produto" in resposta.text


def test_produtos_js_disponivel(client_admin):
    resposta = client_admin.get("/static/js/produtos.js")
    assert resposta.status_code == 200
    assert "carregarProdutos" in resposta.text
    assert "filtrarProdutos" in resposta.text


def test_produtos_js_usa_modal_de_confirmacao_para_excluir(client_admin):
    resposta = client_admin.get("/static/js/produtos.js")
    assert resposta.status_code == 200
    assert "confirmarAcao(" in resposta.text
    assert "confirm(" not in resposta.text

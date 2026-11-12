def test_pagina_estoque_carrega(client_admin):
    resposta = client_admin.get("/estoque-page")
    assert resposta.status_code == 200
    assert "resumo-estoque" in resposta.text


def test_estoque_js_disponivel(client_admin):
    resposta = client_admin.get("/static/js/estoque.js")
    assert resposta.status_code == 200
    assert "carregarEstoque" in resposta.text

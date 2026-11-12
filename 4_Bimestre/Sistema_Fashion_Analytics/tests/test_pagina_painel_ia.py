def test_pagina_painel_ia_carrega(client_admin):
    resposta = client_admin.get("/painel-ia")
    assert resposta.status_code == 200
    assert "botao-analisar" in resposta.text


def test_painel_ia_js_disponivel(client_admin):
    resposta = client_admin.get("/static/js/painel_ia.js")
    assert resposta.status_code == 200
    assert "renderizarAnalise" in resposta.text

def test_pagina_resumo_carrega(client_admin):
    resposta = client_admin.get("/")
    assert resposta.status_code == 200
    assert "kpis-resumo" in resposta.text
    assert "Resumo" in resposta.text


def test_resumo_js_disponivel(client_admin):
    resposta = client_admin.get("/static/js/resumo.js")
    assert resposta.status_code == 200
    assert "dashboard/resumo" in resposta.text

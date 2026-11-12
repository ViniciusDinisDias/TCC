def test_estilos_css_disponivel(client):
    resposta = client.get("/static/css/estilos.css")
    assert resposta.status_code == 200


def test_common_js_disponivel(client):
    resposta = client.get("/static/js/common.js")
    assert resposta.status_code == 200
    assert "chamarApi" in resposta.text
    assert "confirmarAcao" in resposta.text


def test_sem_regra_css_orfa_colidindo_com_icon_btn_excluir(client):
    """`button.excluir{background:var(--critical);...}` era uma regra órfã de
    antes da migração para botões de ícone. Ela vencia `.icon-btn.excluir` na
    propriedade `background` (empate na coluna de classes, ela tem 1 seletor
    de elemento a mais), pintando o botão todo de vermelho por trás de um
    ícone da mesma cor — só ficava visível no hover, quando o fundo clareava."""
    resposta = client.get("/static/css/estilos.css")
    assert resposta.status_code == 200
    assert "button.excluir" not in resposta.text


def test_modal_overlay_respeita_atributo_hidden(client):
    """`.modal-overlay` fixa display:flex, que por padrão vence o atributo
    `hidden` do HTML (empate de especificidade, autor > user agent) — sem
    esse override o modal fica sempre visível, mesmo com hidden=true."""
    resposta = client.get("/static/css/estilos.css")
    assert resposta.status_code == 200
    assert ".modal-overlay[hidden]" in resposta.text

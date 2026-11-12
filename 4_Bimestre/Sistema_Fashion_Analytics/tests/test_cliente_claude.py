from types import SimpleNamespace

import pytest

from app.ia.cliente_claude import extrair_texto


class BlocoPensamento:
    """Imita um ThinkingBlock real: tem .thinking, não tem .text."""

    def __init__(self, pensamento):
        self.thinking = pensamento


def test_extrai_texto_quando_primeiro_bloco_e_texto():
    resposta = SimpleNamespace(content=[SimpleNamespace(text="ola")])
    assert extrair_texto(resposta) == "ola"


def test_extrai_texto_pulando_bloco_de_pensamento_antes_do_texto():
    resposta = SimpleNamespace(content=[BlocoPensamento("pensando..."), SimpleNamespace(text="resultado final")])
    assert extrair_texto(resposta) == "resultado final"


def test_extrai_texto_levanta_erro_se_nao_houver_bloco_de_texto():
    resposta = SimpleNamespace(content=[BlocoPensamento("só pensamento")])
    with pytest.raises(ValueError):
        extrair_texto(resposta)

import json
from types import SimpleNamespace

from app.ia import agente_recomendacoes


class ClienteFalso:
    def __init__(self, texto_resposta):
        self.texto_resposta = texto_resposta
        self.mensagens_recebidas = None
        self.messages = self

    def create(self, **kwargs):
        self.mensagens_recebidas = kwargs
        return SimpleNamespace(content=[SimpleNamespace(text=self.texto_resposta)])


def test_executar_retorna_acoes_da_ia(monkeypatch):
    resposta_json = json.dumps({
        "acoes": [{"titulo": "Repor estoque", "descricao": "Comprar mais unidades", "prioridade": "alta"}]
    })
    cliente_falso = ClienteFalso(resposta_json)
    monkeypatch.setattr(agente_recomendacoes, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_recomendacoes, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_recomendacoes.executar({}, {"interpretacao": "x"}, {"alertas": []})

    assert resultado["acoes"][0]["prioridade"] == "alta"
    assert cliente_falso.mensagens_recebidas["model"] == "modelo-teste"


def test_executar_lida_com_resposta_invalida(monkeypatch):
    cliente_falso = ClienteFalso("não é json")
    monkeypatch.setattr(agente_recomendacoes, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_recomendacoes, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_recomendacoes.executar({}, {}, {})

    assert resultado["acoes"] == []
    assert "erro" in resultado

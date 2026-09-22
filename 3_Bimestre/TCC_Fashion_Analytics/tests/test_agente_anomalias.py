import json
from types import SimpleNamespace

from app.ia import agente_anomalias


class ClienteFalso:
    def __init__(self, texto_resposta):
        self.texto_resposta = texto_resposta
        self.mensagens_recebidas = None
        self.messages = self

    def create(self, **kwargs):
        self.mensagens_recebidas = kwargs
        return SimpleNamespace(content=[SimpleNamespace(text=self.texto_resposta)])


def test_executar_retorna_alertas_da_ia(monkeypatch):
    resposta_json = json.dumps({
        "alertas": [
            {"titulo": "Queda de vendas", "descricao": "Produto X caiu 80%", "severidade": "alta", "produto_relacionado": "Produto X"}
        ]
    })
    cliente_falso = ClienteFalso(resposta_json)
    monkeypatch.setattr(agente_anomalias, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_anomalias, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_anomalias.executar({"ticket_medio": 100.0}, {"interpretacao": "texto"})

    assert resultado["alertas"][0]["severidade"] == "alta"
    assert cliente_falso.mensagens_recebidas["model"] == "modelo-teste"


def test_executar_lida_com_resposta_invalida(monkeypatch):
    cliente_falso = ClienteFalso("não é json")
    monkeypatch.setattr(agente_anomalias, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_anomalias, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_anomalias.executar({}, {})

    assert resultado["alertas"] == []
    assert "erro" in resultado

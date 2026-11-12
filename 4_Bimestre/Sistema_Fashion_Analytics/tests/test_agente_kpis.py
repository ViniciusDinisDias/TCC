import json
from types import SimpleNamespace

from app.ia import agente_kpis


class ClienteFalso:
    def __init__(self, texto_resposta):
        self.texto_resposta = texto_resposta
        self.mensagens_recebidas = None
        self.messages = self

    def create(self, **kwargs):
        self.mensagens_recebidas = kwargs
        return SimpleNamespace(content=[SimpleNamespace(text=self.texto_resposta)])


def test_executar_retorna_interpretacao_da_ia(monkeypatch):
    resposta_json = json.dumps({"interpretacao": "Vendas em alta na Shopee."})
    cliente_falso = ClienteFalso(resposta_json)
    monkeypatch.setattr(agente_kpis, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_kpis, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_kpis.executar({"ticket_medio": 100.0})

    assert resultado == {"interpretacao": "Vendas em alta na Shopee."}
    assert cliente_falso.mensagens_recebidas["model"] == "modelo-teste"


def test_executar_lida_com_resposta_com_cerca_markdown(monkeypatch):
    resposta_cercada = '```json\n{"interpretacao": "texto"}\n```'
    cliente_falso = ClienteFalso(resposta_cercada)
    monkeypatch.setattr(agente_kpis, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_kpis, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_kpis.executar({"ticket_medio": 100.0})

    assert resultado == {"interpretacao": "texto"}


def test_executar_lida_com_resposta_invalida(monkeypatch):
    cliente_falso = ClienteFalso("isso não é um json")
    monkeypatch.setattr(agente_kpis, "obter_cliente", lambda: cliente_falso)
    monkeypatch.setattr(agente_kpis, "obter_modelo", lambda: "modelo-teste")

    resultado = agente_kpis.executar({"ticket_medio": 100.0})

    assert "interpretacao" in resultado
    assert "erro" in resultado

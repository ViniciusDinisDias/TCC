from app import models
from app.ia import orquestrador


def test_executar_analise_chama_agentes_em_sequencia_e_salva(monkeypatch, db_session):
    chamadas = []

    def kpis_falso(resumo):
        chamadas.append("kpis")
        return {"interpretacao": "interpretação teste"}

    def anomalias_falso(resumo, interpretacao_kpis):
        chamadas.append("anomalias")
        assert interpretacao_kpis == {"interpretacao": "interpretação teste"}
        return {"alertas": [{"titulo": "t", "descricao": "d", "severidade": "alta", "produto_relacionado": "x"}]}

    def recomendacoes_falso(resumo, interpretacao_kpis, anomalias):
        chamadas.append("recomendacoes")
        assert anomalias["alertas"][0]["titulo"] == "t"
        return {"acoes": [{"titulo": "a", "descricao": "b", "prioridade": "media"}]}

    monkeypatch.setattr(orquestrador.agente_kpis, "executar", kpis_falso)
    monkeypatch.setattr(orquestrador.agente_anomalias, "executar", anomalias_falso)
    monkeypatch.setattr(orquestrador.agente_recomendacoes, "executar", recomendacoes_falso)

    resultado = orquestrador.executar_analise(db_session)

    assert chamadas == ["kpis", "anomalias", "recomendacoes"]
    assert resultado["kpis"]["interpretacao"] == "interpretação teste"
    assert resultado["anomalias"]["alertas"][0]["titulo"] == "t"
    assert resultado["recomendacoes"]["acoes"][0]["titulo"] == "a"

    analise_salva = db_session.query(models.AnaliseIA).first()
    assert analise_salva is not None

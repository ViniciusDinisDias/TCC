import json

from app import models
from app.routers import ia as rotas_ia


def test_post_analisar_chama_orquestrador(client_admin, monkeypatch):
    def analise_falsa(db):
        return {"gerado_em": "2026-01-01T00:00:00", "kpis": {}, "anomalias": {}, "recomendacoes": {}}

    monkeypatch.setattr(rotas_ia, "executar_analise", analise_falsa)

    resposta = client_admin.post("/ia/analisar")

    assert resposta.status_code == 200
    assert resposta.json()["gerado_em"] == "2026-01-01T00:00:00"


def test_post_analisar_retorna_503_quando_ia_falha(client_admin, monkeypatch):
    def analise_com_erro(db):
        raise Exception("falha simulada na chamada da IA")

    monkeypatch.setattr(rotas_ia, "executar_analise", analise_com_erro)

    resposta = client_admin.post("/ia/analisar")

    assert resposta.status_code == 503
    assert resposta.json()["detail"] == (
        "Não foi possível falar com a IA. Verifique a ANTHROPIC_API_KEY no arquivo .env."
    )


def test_get_ultima_retorna_none_quando_sem_analises(client_admin):
    resposta = client_admin.get("/ia/ultima")
    assert resposta.status_code == 200
    assert resposta.json() is None


def test_get_ultima_retorna_analise_mais_recente(client_admin, db_session):
    analise = models.AnaliseIA(
        kpis_json=json.dumps({"interpretacao": "x"}),
        anomalias_json=json.dumps({"alertas": []}),
        recomendacoes_json=json.dumps({"acoes": []}),
    )
    db_session.add(analise)
    db_session.commit()

    resposta = client_admin.get("/ia/ultima")

    assert resposta.status_code == 200
    assert resposta.json()["kpis"] == {"interpretacao": "x"}


def test_historico_lista_analises(client_admin, db_session):
    db_session.add(models.AnaliseIA(kpis_json="{}", anomalias_json="{}", recomendacoes_json="{}"))
    db_session.add(models.AnaliseIA(kpis_json="{}", anomalias_json="{}", recomendacoes_json="{}"))
    db_session.commit()

    resposta = client_admin.get("/ia/historico")

    assert resposta.status_code == 200
    assert len(resposta.json()) == 2

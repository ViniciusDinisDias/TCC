import json
from datetime import datetime

from sqlalchemy.orm import Session

from app import models
from app.ia import agente_anomalias, agente_kpis, agente_recomendacoes
from app.ia.resumo import montar_resumo_dados


def executar_analise(db: Session) -> dict:
    """Chama os 3 agentes em sequência e salva o resultado consolidado."""
    resumo = montar_resumo_dados(db)

    interpretacao_kpis = agente_kpis.executar(resumo)
    anomalias = agente_anomalias.executar(resumo, interpretacao_kpis)
    recomendacoes = agente_recomendacoes.executar(resumo, interpretacao_kpis, anomalias)

    resultado = {
        "gerado_em": datetime.utcnow().isoformat(),
        "kpis": {"dados_calculados": resumo, "interpretacao": interpretacao_kpis.get("interpretacao", "")},
        "anomalias": anomalias,
        "recomendacoes": recomendacoes,
    }

    db.add(models.AnaliseIA(
        data_hora=datetime.utcnow(),
        kpis_json=json.dumps(resultado["kpis"], ensure_ascii=False),
        anomalias_json=json.dumps(resultado["anomalias"], ensure_ascii=False),
        recomendacoes_json=json.dumps(resultado["recomendacoes"], ensure_ascii=False),
    ))
    db.commit()

    return resultado

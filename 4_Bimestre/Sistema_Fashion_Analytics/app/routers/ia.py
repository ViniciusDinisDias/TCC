import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth, models
from app.database import get_db
from app.ia.orquestrador import executar_analise

router = APIRouter(prefix="/ia", tags=["ia"])


@router.post("/analisar")
def analisar(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    try:
        return executar_analise(db)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível falar com a IA. Verifique a ANTHROPIC_API_KEY no arquivo .env.",
        )


@router.get("/ultima")
def ultima_analise(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    analise = db.query(models.AnaliseIA).order_by(models.AnaliseIA.data_hora.desc()).first()
    if not analise:
        return None
    return {
        "gerado_em": analise.data_hora.isoformat(),
        "kpis": json.loads(analise.kpis_json),
        "anomalias": json.loads(analise.anomalias_json),
        "recomendacoes": json.loads(analise.recomendacoes_json),
    }


@router.get("/historico")
def historico(db: Session = Depends(get_db), usuario: dict = Depends(auth.exigir_login)):
    analises = db.query(models.AnaliseIA).order_by(models.AnaliseIA.data_hora.desc()).all()
    return [{"id": a.id, "data_hora": a.data_hora.isoformat()} for a in analises]

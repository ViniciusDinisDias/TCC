import json

from app.ia.cliente_claude import extrair_texto, obter_cliente, obter_modelo

SYSTEM_PROMPT = """Você é um consultor de logística para um pequeno comércio de roupas femininas
(loja física + Shopee). Você recebe o resumo de dados, a interpretação de KPIs e a lista de
anomalias detectadas por outros analistas. Com base nisso, sugira ações práticas e específicas:
reposição de estoque, produtos a promover, ajustes de canal de venda. Seja concreto — cite
produtos pelo nome quando fizer sentido.

Responda APENAS com um JSON válido, sem nenhum texto fora do JSON, no formato:
{"acoes": [{"titulo": "...", "descricao": "...", "prioridade": "alta|media|baixa"}]}
"""


def executar(resumo: dict, interpretacao_kpis: dict, anomalias: dict) -> dict:
    cliente = obter_cliente()
    conteudo = json.dumps(
        {"resumo": resumo, "interpretacao_kpis": interpretacao_kpis, "anomalias": anomalias},
        ensure_ascii=False,
    )
    resposta = cliente.messages.create(
        model=obter_modelo(),
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": conteudo}],
    )
    texto = extrair_texto(resposta)
    inicio = texto.find("{")
    fim = texto.rfind("}")
    if inicio != -1 and fim != -1 and fim > inicio:
        texto_json = texto[inicio : fim + 1]
    else:
        texto_json = texto
    try:
        return json.loads(texto_json)
    except json.JSONDecodeError:
        return {"acoes": [], "erro": texto}

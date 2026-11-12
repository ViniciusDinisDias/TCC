import json

from app.ia.cliente_claude import extrair_texto, obter_cliente, obter_modelo

SYSTEM_PROMPT = """Você é um especialista em detectar anomalias operacionais em um pequeno
comércio de roupas (loja física + Shopee). Você recebe um resumo em JSON com números já
calculados (produtos parados, estoque baixo, giro de estoque, faturamento por canal) e a
interpretação de KPIs feita por outro analista. Use esses sinais — e qualquer padrão que você
observar nos dados brutos fornecidos — para levantar alertas relevantes (quedas bruscas de
venda, produtos parados há muito tempo, divergência entre canais, possíveis erros de cadastro).
Se não houver nenhuma anomalia relevante, devolva uma lista vazia.

Responda APENAS com um JSON válido, sem nenhum texto fora do JSON, no formato:
{"alertas": [{"titulo": "...", "descricao": "...", "severidade": "alta|media|baixa", "produto_relacionado": "..."}]}
"""


def executar(resumo: dict, interpretacao_kpis: dict) -> dict:
    cliente = obter_cliente()
    conteudo = json.dumps({"resumo": resumo, "interpretacao_kpis": interpretacao_kpis}, ensure_ascii=False)
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
        return {"alertas": [], "erro": texto}

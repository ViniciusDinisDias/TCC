import json

from app.ia.cliente_claude import extrair_tool_input, obter_cliente, obter_modelo

SYSTEM_PROMPT = """Você é um analista de dados especializado em varejo de moda (loja física e Shopee).
Você recebe um resumo em JSON com números JÁ CALCULADOS (faturamento por canal, ticket médio,
produtos mais vendidos, giro de estoque). NÃO recalcule nem invente números: use exclusivamente
os valores fornecidos para interpretar tendências e comparar os canais de venda.

Seja direto, concreto e específico, citando os números relevantes. No máximo 2 parágrafos curtos."""

FERRAMENTA_INTERPRETACAO = {
    "name": "registrar_interpretacao",
    "description": "Registra a interpretação textual dos KPIs já calculados.",
    "input_schema": {
        "type": "object",
        "properties": {
            "interpretacao": {
                "type": "string",
                "description": "Texto em português explicando as tendências e a comparação entre canais, no máximo 2 parágrafos curtos, citando números concretos do resumo recebido.",
            }
        },
        "required": ["interpretacao"],
    },
}


def executar(resumo: dict) -> dict:
    """Chama o Claude para interpretar os KPIs já calculados em Python.

    Usa tool use forçado em vez de pedir JSON solto em texto: isso elimina
    o erro de parsing causado por markdown ou quebras de linha não escapadas
    na resposta, e permite um max_tokens bem menor (mais econômico), já que
    não sobra "conversa" nem formatação em volta do dado que interessa.
    """
    cliente = obter_cliente()
    resposta = cliente.messages.create(
        model=obter_modelo(),
        max_tokens=600,
        system=SYSTEM_PROMPT,
        tools=[FERRAMENTA_INTERPRETACAO],
        tool_choice={"type": "tool", "name": "registrar_interpretacao"},
        messages=[{"role": "user", "content": json.dumps(resumo, ensure_ascii=False)}],
    )
    try:
        return extrair_tool_input(resposta, "registrar_interpretacao")
    except ValueError:
        return {"interpretacao": "Não foi possível interpretar a resposta da IA."}
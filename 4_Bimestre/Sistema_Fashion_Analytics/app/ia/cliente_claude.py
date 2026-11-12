import os

import anthropic

_cliente = None


def obter_cliente() -> anthropic.Anthropic:
    global _cliente
    if _cliente is None:
        _cliente = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _cliente


def obter_modelo() -> str:
    return os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")


def extrair_texto(resposta) -> str:
    """Pega o primeiro bloco de texto da resposta. Com extended thinking, o
    primeiro bloco pode ser um ThinkingBlock (sem atributo .text) em vez do
    texto de fato — por isso não dá pra assumir content[0] direto."""
    for bloco in resposta.content:
        if hasattr(bloco, "text"):
            return bloco.text
    raise ValueError("A resposta da IA não contém nenhum bloco de texto.")


def extrair_tool_input(resposta, nome_tool: str) -> dict:
    """Pega o input estruturado do bloco de tool_use retornado pela IA.

    Usar 'tool use' forçado (tool_choice) em vez de pedir JSON solto em texto
    evita o problema clássico de parsing quebrado: quando a IA responde JSON
    dentro de markdown, ou com quebras de linha literais dentro de uma string
    (que tornam o JSON tecnicamente inválido), um parsing manual por
    find("{")/rfind("}") falha. Com tool use, a própria API já garante que
    o campo `input` do bloco é um objeto estruturado válido — não há texto
    solto pra interpretar.
    """
    for bloco in resposta.content:
        if getattr(bloco, "type", None) == "tool_use" and bloco.name == nome_tool:
            return bloco.input
    raise ValueError(f"A resposta da IA não usou a tool esperada '{nome_tool}'.")
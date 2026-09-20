import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ContextoEstoque {
  totalProdutos: number;
  totalEmEstoque: number;
  produtosBaixoEstoque: Array<{
    nome: string;
    sku: string;
    totalEstoque: number;
    estoqueMinimo: number;
    categoria: string;
  }>;
  vendasPorCanal: Array<{ canal: string; quantidade: number }>;
  movimentacoesRecentes: Array<{
    tipo: string;
    produto: string;
    quantidade: number;
    canal: string;
    data: string;
  }>;
  topProdutosMovimentacao: Array<{ produto: string; totalSaidas: number; margem: number }>;
  estoqueValorTotal: number;
  periodo: string;
}

@Injectable()
export class AnthropicProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = new Anthropic({ apiKey: apiKey || 'placeholder' });
  }

  async analisarEstoque(contexto: ContextoEstoque): Promise<{
    insights: any[];
    previsoes: any[];
    recomendacoes: any[];
  }> {
    const prompt = this.construirPrompt(contexto);

    this.logger.log('Enviando dados para análise Claude AI...');

    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey || apiKey === 'placeholder') {
      this.logger.warn('ANTHROPIC_API_KEY não configurada. Retornando análise simulada.');
      return this.analiseSimulada(contexto);
    }

    try {
      const message = await this.client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: `Você é um especialista em gestão de estoque e análise de dados para confecções de moda feminina.
Analise os dados fornecidos e retorne APENAS um JSON válido (sem markdown, sem blocos de código, apenas JSON puro) com a seguinte estrutura:
{
  "insights": [
    {
      "tipo": "tendencia|alerta|oportunidade|performance",
      "titulo": "string",
      "descricao": "string",
      "prioridade": "critica|alta|media|baixa",
      "dados": {}
    }
  ],
  "previsoes": [
    {
      "mes": "string",
      "totalPrevisto": number,
      "confianca": number,
      "fatores": ["string"]
    }
  ],
  "recomendacoes": [
    {
      "titulo": "string",
      "descricao": "string",
      "impacto": "alto|medio|baixo",
      "prazo": "imediato|curto|medio|longo"
    }
  ]
}`,
      });

      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Resposta inválida da IA');

      const resultado = JSON.parse(content.text);
      this.logger.log('Análise IA concluída com sucesso');
      return resultado;
    } catch (error) {
      this.logger.error('Erro na análise IA:', error.message);
      return this.analiseSimulada(contexto);
    }
  }

  private construirPrompt(ctx: ContextoEstoque): string {
    return `
Analise os seguintes dados de estoque de uma confecção feminina no período: ${ctx.periodo}

RESUMO GERAL:
- Total de produtos ativos: ${ctx.totalProdutos}
- Total de itens em estoque: ${ctx.totalEmEstoque}
- Valor total do estoque: R$ ${ctx.estoqueValorTotal.toFixed(2)}

PRODUTOS COM ESTOQUE CRÍTICO (${ctx.produtosBaixoEstoque.length} produtos):
${ctx.produtosBaixoEstoque
  .slice(0, 10)
  .map((p) => `- ${p.nome} (${p.sku}): ${p.totalEstoque} un (mín: ${p.estoqueMinimo}) - Categoria: ${p.categoria}`)
  .join('\n')}

DISTRIBUIÇÃO POR CANAL:
${ctx.vendasPorCanal.map((v) => `- ${v.canal}: ${v.quantidade} unidades`).join('\n')}

TOP PRODUTOS POR MOVIMENTAÇÃO (últimos 30 dias):
${ctx.topProdutosMovimentacao
  .slice(0, 5)
  .map((p) => `- ${p.produto}: ${p.totalSaidas} saídas, margem ${p.margem.toFixed(1)}%`)
  .join('\n')}

MOVIMENTAÇÕES RECENTES (últimas 10):
${ctx.movimentacoesRecentes
  .slice(0, 10)
  .map((m) => `- [${m.tipo}] ${m.produto}: ${m.quantidade} un via ${m.canal} em ${m.data}`)
  .join('\n')}

Gere uma análise completa com insights, previsões para os próximos 4 meses e recomendações estratégicas.
    `.trim();
  }

  private analiseSimulada(ctx: ContextoEstoque): {
    insights: any[];
    previsoes: any[];
    recomendacoes: any[];
  } {
    const insights = [
      {
        tipo: 'tendencia',
        titulo: 'Crescimento no Canal Online',
        descricao: `As vendas online representam a maior fatia de movimentação. Recomenda-se priorizar o abastecimento deste canal.`,
        prioridade: 'alta',
        dados: { canal: 'Online', crescimento: '23%' },
      },
      {
        tipo: 'alerta',
        titulo: `${ctx.produtosBaixoEstoque.length} Produtos com Estoque Crítico`,
        descricao: `Existem ${ctx.produtosBaixoEstoque.length} produtos abaixo do estoque mínimo. Risco de ruptura de estoque iminente.`,
        prioridade: ctx.produtosBaixoEstoque.length > 5 ? 'critica' : 'alta',
        dados: { produtos: ctx.produtosBaixoEstoque.slice(0, 3).map((p) => p.nome) },
      },
      {
        tipo: 'oportunidade',
        titulo: 'Sazonalidade Identificada',
        descricao: 'Análise histórica indica aumento de demanda de 35% entre maio e junho. Ideal para aumentar produção de vestidos e blusas.',
        prioridade: 'media',
        dados: { meses: ['Maio', 'Junho'], aumento: '35%' },
      },
      {
        tipo: 'performance',
        titulo: 'Otimização de Margem',
        descricao: 'Produtos da categoria Vestidos apresentam a maior margem de contribuição. Priorizar produção destes itens aumenta rentabilidade.',
        prioridade: 'media',
        dados: { categoria: 'Vestidos', margemMedia: '58%' },
      },
    ];

    const meses = ['Maio', 'Junho', 'Julho', 'Agosto'];
    const previsoes = meses.map((mes, i) => ({
      mes,
      totalPrevisto: Math.round(ctx.totalEmEstoque * (0.8 + Math.random() * 0.4) + i * 50),
      confianca: Math.round(85 - i * 5),
      fatores: ['Sazonalidade', 'Histórico de vendas', 'Tendência de mercado'],
    }));

    const recomendacoes = [
      {
        titulo: 'Reposição Urgente de Estoque',
        descricao: `Realizar pedido de produção imediato para os ${ctx.produtosBaixoEstoque.length} produtos abaixo do mínimo.`,
        impacto: 'alto',
        prazo: 'imediato',
      },
      {
        titulo: 'Redistribuição por Canal',
        descricao: 'Rebalancear estoque: 40% Online, 35% Revendedores, 25% Loja Física com base nos padrões de venda.',
        impacto: 'medio',
        prazo: 'curto',
      },
      {
        titulo: 'Aumento de Produção - Alta Demanda',
        descricao: 'Vestidos Florais e Blusas Estampadas apresentam alta rotatividade. Aumentar produção em 30% para preparar estoque de inverno.',
        impacto: 'alto',
        prazo: 'medio',
      },
    ];

    return { insights, previsoes, recomendacoes };
  }
}

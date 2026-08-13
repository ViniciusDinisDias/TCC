import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, BarChart3, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "./ui/badge";

export function AnaliseIA() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState("ultimo-mes");
  const [analisando, setAnalisando] = useState(false);

  const insights = [
    {
      tipo: "tendencia",
      titulo: "Aumento nas Vendas Online",
      descricao: "As vendas online cresceram 23% no último mês, superando a loja física. Recomenda-se aumentar o estoque destinado ao canal digital.",
      prioridade: "alta",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      tipo: "alerta",
      titulo: "Estoque Baixo - Vestido Longo",
      descricao: "O produto 'Vestido Longo' está com apenas 23 unidades em estoque. Com base no histórico de vendas, o estoque deve acabar em 12 dias.",
      prioridade: "critica",
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      tipo: "oportunidade",
      titulo: "Melhor Período para Produção",
      descricao: "Análise histórica indica que a demanda aumenta 35% entre maio e junho. Sugestão: aumentar produção de vestidos e blusas nas próximas 2 semanas.",
      prioridade: "media",
      icon: Lightbulb,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      tipo: "performance",
      titulo: "Produto Mais Rentável",
      descricao: "A 'Blusa Estampada' apresenta a melhor relação custo-benefício com margem de 58% e alta rotatividade. Considere aumentar a produção deste modelo.",
      prioridade: "media",
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  const previsaoVendas = [
    { mes: "Abr (Real)", lojaFisica: 342, online: 589, previsao: null },
    { mes: "Mai", lojaFisica: null, online: null, previsao: 1050 },
    { mes: "Jun", lojaFisica: null, online: null, previsao: 1180 },
    { mes: "Jul", lojaFisica: null, online: null, previsao: 920 },
    { mes: "Ago", lojaFisica: null, online: null, previsao: 1090 },
  ];

  const comparacaoPeriodos = [
    { periodo: "Semana 1", atual: 245, anterior: 198 },
    { periodo: "Semana 2", atual: 289, anterior: 234 },
    { periodo: "Semana 3", atual: 312, anterior: 256 },
    { periodo: "Semana 4", atual: 285, anterior: 221 },
  ];

  const handleAnalisar = () => {
    setAnalisando(true);
    setTimeout(() => {
      setAnalisando(false);
    }, 2000);
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-500" />
                Análise com IA
              </h2>
              <p className="text-gray-600 mt-1">Insights inteligentes para tomada de decisão</p>
            </div>

            <div className="flex items-center gap-4">
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultima-semana">Última Semana</SelectItem>
                  <SelectItem value="ultimo-mes">Último Mês</SelectItem>
                  <SelectItem value="ultimo-trimestre">Último Trimestre</SelectItem>
                  <SelectItem value="ultimo-ano">Último Ano</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleAnalisar}
                className="bg-purple-500 hover:bg-purple-600 text-white"
                disabled={analisando}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {analisando ? "Analisando..." : "Analisar Dados"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${insight.bgColor}`}>
                    <Icon className={`w-6 h-6 ${insight.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">{insight.titulo}</h3>
                      <Badge
                        variant={
                          insight.prioridade === "critica"
                            ? "destructive"
                            : insight.prioridade === "alta"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {insight.prioridade === "critica"
                          ? "Crítico"
                          : insight.prioridade === "alta"
                          ? "Alta"
                          : "Média"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{insight.descricao}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-800">Previsão de Vendas (IA)</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={previsaoVendas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="lojaFisica" stroke="#8b5cf6" name="Loja Física" strokeWidth={2} />
                <Line type="monotone" dataKey="online" stroke="#3b82f6" name="Online" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="previsao"
                  stroke="#10b981"
                  name="Previsão IA"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-600 mt-4">
              A IA prevê um aumento de vendas nos próximos meses, com pico em junho. Prepare o estoque com antecedência.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-800">Comparação de Períodos</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparacaoPeriodos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodo" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="atual" stroke="#3b82f6" name="Período Atual" strokeWidth={2} />
                <Line type="monotone" dataKey="anterior" stroke="#94a3b8" name="Período Anterior" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-600 mt-4">
              As vendas do período atual estão 18% acima do período anterior, indicando crescimento consistente.
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recomendações da IA</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="p-2 bg-purple-500 rounded-full mt-1">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">Otimização de Estoque por Canal</h4>
                <p className="text-sm text-gray-600">
                  Com base nos padrões de venda, recomenda-se redistribuir: 40% para Online, 35% para Revendedores e 25%
                  para Loja Física.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="p-2 bg-blue-500 rounded-full mt-1">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">Produtos para Aumentar Produção</h4>
                <p className="text-sm text-gray-600">
                  Vestidos Florais e Blusas Estampadas apresentam alta demanda e boa margem. Sugestão: aumentar produção
                  em 30%.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="p-2 bg-green-500 rounded-full mt-1">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1">Estratégia de Precificação</h4>
                <p className="text-sm text-gray-600">
                  Análise de elasticidade indica que é possível aumentar preços em 5-8% nos produtos de alta demanda sem
                  impactar vendas.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

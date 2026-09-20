import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Sparkles, TrendingUp, AlertCircle, Lightbulb, BarChart3,
  Calendar, RefreshCw, Clock, AlertTriangle, CheckCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import { analiseService } from "../../services/analiseService";
import type { AnaliseIA as AnaliseIAType, InsightIA, RecomendacaoIA } from "../../types";

const INSIGHT_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  tendencia: { icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
  alerta: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-50" },
  oportunidade: { icon: Lightbulb, color: "text-yellow-600", bgColor: "bg-yellow-50" },
  performance: { icon: BarChart3, color: "text-blue-600", bgColor: "bg-blue-50" },
};

const PRIORIDADE_CONFIG: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  critica: "destructive",
  alta: "default",
  media: "secondary",
  baixa: "outline",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  critica: "Crítico",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const IMPACTO_COLORS: Record<string, string> = {
  alto: "bg-red-100 text-red-700",
  medio: "bg-yellow-100 text-yellow-700",
  baixo: "bg-green-100 text-green-700",
};

const PRAZO_LABELS: Record<string, string> = {
  imediato: "Imediato",
  curto: "Curto prazo",
  medio: "Médio prazo",
  longo: "Longo prazo",
};

export function AnaliseIA() {
  const [analise, setAnalise] = useState<AnaliseIAType | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [periodo, setPeriodo] = useState("ultimo-mes");
  const [erro, setErro] = useState<string | null>(null);

  const carregarUltima = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await analiseService.getUltima();
      setAnalise(data);
    } catch (e: any) {
      setErro(e.response?.data?.message ?? "Erro ao carregar análise");
    } finally {
      setCarregando(false);
    }
  };

  const handleGerarAnalise = async () => {
    setGerando(true);
    setErro(null);
    try {
      toast.info("Gerando análise com IA... isso pode levar alguns segundos");
      const data = await analiseService.gerarAnalise(periodo);
      setAnalise(data);
      toast.success("Análise gerada com sucesso!");
    } catch (e: any) {
      const msg = e.response?.data?.message ?? "Erro ao gerar análise";
      setErro(msg);
      toast.error(msg);
    } finally {
      setGerando(false);
    }
  };

  useEffect(() => {
    carregarUltima();
  }, []);

  const insights: InsightIA[] = Array.isArray(analise?.insights) ? analise.insights : [];
  const previsoes = Array.isArray(analise?.previsoes) ? analise.previsoes : [];
  const recomendacoes: RecomendacaoIA[] = Array.isArray(analise?.recomendacoes) ? analise.recomendacoes : [];

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
              {analise?.criadoEm && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Última análise: {new Date(analise.criadoEm).toLocaleString("pt-BR")}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Select value={periodo} onValueChange={setPeriodo}>
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

              <Button onClick={handleGerarAnalise} className="bg-purple-500 hover:bg-purple-600 text-white" disabled={gerando}>
                <Sparkles className="w-4 h-4 mr-2" />
                {gerando ? "Analisando..." : "Gerar Nova Análise"}
              </Button>

              <Button onClick={carregarUltima} variant="outline" disabled={carregando}>
                <RefreshCw className={`w-4 h-4 ${carregando ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Contexto da análise */}
        {analise?.contexto && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Produtos Analisados", value: analise.contexto.totalProdutos, icon: BarChart3, color: "text-blue-500" },
              { label: "Total em Estoque", value: analise.contexto.totalEmEstoque, icon: TrendingUp, color: "text-green-500" },
              { label: "Produtos Críticos", value: analise.contexto.produtosBaixoEstoque, icon: AlertCircle, color: "text-red-500" },
              { label: "Valor em Estoque", value: `R$ ${analise.contexto.estoqueValorTotal?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: Sparkles, color: "text-purple-500" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${item.color}`} />
                    <div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-lg font-bold text-gray-800">{item.value}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Estado de carregamento */}
        {(carregando || gerando) && !analise && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        )}

        {erro && !analise && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <AlertTriangle className="w-10 h-10 mb-2 text-red-400" />
            <p className="text-gray-600">{erro}</p>
            <Button onClick={handleGerarAnalise} className="mt-3 bg-purple-500 hover:bg-purple-600 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Análise
            </Button>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {insights.map((insight, index) => {
              const cfg = INSIGHT_CONFIG[insight.tipo] ?? INSIGHT_CONFIG.performance;
              const Icon = cfg.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${cfg.bgColor} flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="font-semibold text-gray-800 text-sm">{insight.titulo}</h3>
                        <Badge variant={PRIORIDADE_CONFIG[insight.prioridade] ?? "secondary"} className="flex-shrink-0">
                          {PRIORIDADE_LABEL[insight.prioridade] ?? insight.prioridade}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{insight.descricao}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Previsões */}
        {previsoes.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-800">Previsão de Demanda (IA)</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={previsoes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(v) => [v, "Unidades previstas"]} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalPrevisto"
                    stroke="#8b5cf6"
                    name="Previsão IA"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#8b5cf6", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-3">
                Previsões baseadas em análise histórica de movimentações e sazonalidade.
              </p>
            </Card>

            {/* Confiança das previsões */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">Detalhes das Previsões</h3>
              </div>
              <div className="space-y-4">
                {previsoes.map((prev, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800 text-sm">{prev.mes}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-purple-600 font-bold">{prev.totalPrevisto} un</span>
                        <Badge variant="outline" className="text-xs">
                          {prev.confianca}% confiança
                        </Badge>
                      </div>
                    </div>
                    {prev.fatores?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {prev.fatores.slice(0, 3).map((fator, fi) => (
                          <span key={fi} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            {fator}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Recomendações */}
        {recomendacoes.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recomendações Estratégicas da IA</h3>
            <div className="space-y-4">
              {recomendacoes.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <div className="p-2 bg-purple-500 rounded-full mt-1 flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800 text-sm">{rec.titulo}</h4>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${IMPACTO_COLORS[rec.impacto] ?? "bg-gray-100 text-gray-700"}`}>
                          {rec.impacto === "alto" ? "Alto impacto" : rec.impacto === "medio" ? "Médio impacto" : "Baixo impacto"}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {PRAZO_LABELS[rec.prazo] ?? rec.prazo}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{rec.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Estado vazio — sem análise anterior */}
        {!carregando && !gerando && !analise && !erro && (
          <div className="flex flex-col items-center justify-center h-64">
            <Sparkles className="w-16 h-16 text-purple-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhuma análise disponível</h3>
            <p className="text-gray-500 text-sm mb-4">Clique em "Gerar Nova Análise" para iniciar</p>
            <Button onClick={handleGerarAnalise} className="bg-purple-500 hover:bg-purple-600 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Análise com IA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

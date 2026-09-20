import { useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Package, ArrowUpCircle, ArrowDownCircle,
  Store, Laptop, Users, RefreshCw, AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { useDashboardStore } from "../../store/dashboardStore";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

const CANAL_ICONS: Record<string, React.ElementType> = {
  LOJA_FISICA: Store,
  ONLINE: Laptop,
  REVENDEDORES: Users,
};

export function Dashboard() {
  const { dados, carregando, erro, carregarDados, ultimaAtualizacao } = useDashboardStore();

  useEffect(() => {
    carregarDados();
  }, []);

  if (carregando && !dados) {
    return (
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">{erro}</p>
          <Button onClick={carregarDados} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const kpis = dados?.kpis;
  const metricsCards = kpis
    ? [
        {
          title: "Total em Estoque",
          value: kpis.totalEmEstoque.toLocaleString("pt-BR"),
          change: kpis.variacaoMovimentacoes,
          trend: kpis.variacaoMovimentacoes.startsWith("+") ? "up" : "down",
          icon: Package,
          color: "bg-blue-500",
        },
        {
          title: "Movimentações (mês)",
          value: kpis.movimentacoesMes.toString(),
          change: kpis.variacaoMovimentacoes,
          trend: kpis.variacaoMovimentacoes.startsWith("+") ? "up" : "down",
          icon: ArrowUpCircle,
          color: "bg-green-500",
        },
        {
          title: "Entradas (mês)",
          value: kpis.entradasMes.toLocaleString("pt-BR"),
          change: "+",
          trend: "up",
          icon: ArrowUpCircle,
          color: "bg-purple-500",
        },
        {
          title: "Produtos Críticos",
          value: kpis.produtosBaixoEstoque.toString(),
          change: kpis.produtosBaixoEstoque > 0 ? "⚠" : "✓",
          trend: kpis.produtosBaixoEstoque > 0 ? "down" : "up",
          icon: AlertTriangle,
          color: kpis.produtosBaixoEstoque > 0 ? "bg-red-500" : "bg-orange-500",
        },
      ]
    : [];

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
            <p className="text-gray-600 mt-1">
              {ultimaAtualizacao
                ? `Atualizado: ${ultimaAtualizacao.toLocaleTimeString("pt-BR")}`
                : "Visão geral do estoque e movimentações"}
            </p>
          </div>
          <Button onClick={carregarDados} variant="outline" disabled={carregando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricsCards.map((metric, index) => {
            const Icon = metric.icon;
            const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${metric.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    <TrendIcon className="w-4 h-4" />
                    {metric.change}
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">{metric.title}</h3>
                <p className="text-2xl font-bold text-gray-800">{metric.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Gráficos principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Movimentações Mensais</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dados?.movimentacoesMensais ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entradas" stroke="#10b981" name="Entradas" strokeWidth={2} />
                <Line type="monotone" dataKey="saidas" stroke="#ef4444" name="Saídas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estoque por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dados?.estoquePorCategoria ?? []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="total"
                  nameKey="categoria"
                >
                  {(dados?.estoquePorCategoria ?? []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Estoque por Canal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {(dados?.estoquePorCanal ?? []).map((canal, i) => {
            const Icon = CANAL_ICONS[canal.tipo] ?? Store;
            const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-orange-500"];
            return (
              <Card key={i} className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-lg ${colors[i % colors.length]}`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">{canal.canal}</p>
                    <p className="text-3xl font-bold text-gray-800">{canal.total.toLocaleString("pt-BR")}</p>
                    <p className="text-gray-500 text-sm">unidades</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Distribuição por canal (bar) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Canal</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dados?.estoquePorCanal ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="canal" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Unidades" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Produtos críticos */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Produtos com Estoque Crítico
              {(dados?.produtosBaixoEstoque?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-2">{dados?.produtosBaixoEstoque.length}</Badge>
              )}
            </h3>
            {(dados?.produtosBaixoEstoque?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Package className="w-10 h-10 mb-2" />
                <p className="text-sm">Nenhum produto em estado crítico</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dados?.produtosBaixoEstoque.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{produto.nome}</p>
                      <p className="text-xs text-gray-500">{produto.sku} • {produto.categoria}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{produto.totalEstoque} un</p>
                      <p className="text-xs text-gray-500">mín: {produto.estoqueMinimo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

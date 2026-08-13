import { Card } from "./ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Package, ShoppingCart, Store, Laptop } from "lucide-react";

export function Dashboard() {
  const metricsData = [
    {
      title: "Total em Estoque",
      value: "1.247",
      change: "+12%",
      trend: "up",
      icon: Package,
      color: "bg-blue-500",
    },
    {
      title: "Vendas Mês",
      value: "R$ 18.450",
      change: "+8%",
      trend: "up",
      icon: ShoppingCart,
      color: "bg-green-500",
    },
    {
      title: "Loja Física",
      value: "342",
      change: "-3%",
      trend: "down",
      icon: Store,
      color: "bg-purple-500",
    },
    {
      title: "Vendas Online",
      value: "589",
      change: "+23%",
      trend: "up",
      icon: Laptop,
      color: "bg-orange-500",
    },
  ];

  const salesData = [
    { mes: "Out", lojaFisica: 280, online: 420, revendedores: 560 },
    { mes: "Nov", lojaFisica: 310, online: 480, revendedores: 620 },
    { mes: "Dez", lojaFisica: 390, online: 550, revendedores: 680 },
    { mes: "Jan", lojaFisica: 320, online: 510, revendedores: 590 },
    { mes: "Fev", lojaFisica: 350, online: 570, revendedores: 640 },
    { mes: "Mar", lojaFisica: 342, online: 589, revendedores: 670 },
  ];

  const productData = [
    { name: "Vestidos", value: 340 },
    { name: "Blusas", value: 280 },
    { name: "Saias", value: 220 },
    { name: "Calças", value: 190 },
    { name: "Outros", value: 217 },
  ];

  const stockByChannel = [
    { canal: "Loja Física", quantidade: 342 },
    { canal: "Online", quantidade: 589 },
    { canal: "Revendedores", quantidade: 316 },
  ];

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-600 mt-1">Visão geral do estoque e vendas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricsData.map((metric, index) => {
            const Icon = metric.icon;
            const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;

            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${metric.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      metric.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas por Canal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="lojaFisica" stroke="#8b5cf6" name="Loja Física" strokeWidth={2} />
                <Line type="monotone" dataKey="online" stroke="#3b82f6" name="Online" strokeWidth={2} />
                <Line type="monotone" dataKey="revendedores" stroke="#10b981" name="Revendedores" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estoque por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Estoque por Canal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stockByChannel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="canal" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

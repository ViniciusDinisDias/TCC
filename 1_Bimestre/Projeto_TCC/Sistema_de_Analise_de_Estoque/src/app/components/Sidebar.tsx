import { LayoutDashboard, Package, TrendingUp, BarChart3, Settings } from "lucide-react";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "estoque", label: "Estoque", icon: TrendingUp },
    { id: "analise", label: "Análise IA", icon: BarChart3 },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Sistema de Estoque</h1>
        <p className="text-sm text-gray-500 mt-1">Confecção Feminina</p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configurações</span>
        </button>
      </div>
    </div>
  );
}

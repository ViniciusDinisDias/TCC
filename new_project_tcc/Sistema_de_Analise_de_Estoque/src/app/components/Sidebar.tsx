import { LayoutDashboard, Package, TrendingUp, BarChart3, Settings, LogOut, User, ChevronRight } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../services/authService";
import { toast } from "sonner";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { usuario, clearAuth } = useAuthStore();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "estoque", label: "Estoque", icon: TrendingUp },
    { id: "analise", label: "Análise IA", icon: BarChart3 },
  ];

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
    } finally {
      clearAuth();
      toast.success("Logout realizado com sucesso");
    }
  };

  const papelLabel: Record<string, string> = {
    ADMIN: "Administrador",
    GERENTE: "Gerente",
    OPERADOR: "Operador",
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800 leading-tight">Sistema de Estoque</h1>
            <p className="text-xs text-gray-500">Confecção Feminina</p>
          </div>
        </div>
      </div>

      {usuario && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{usuario.nome}</p>
              <p className="text-xs text-gray-500">{papelLabel[usuario.papel] ?? usuario.papel}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                isActive
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium text-sm">Configurações</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
}

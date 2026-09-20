import { useState } from "react";
import { useNavigate } from "react-router";
import { Package, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Label } from "../app/components/ui/label";
import { Card } from "../app/components/ui/card";
import { useAuthStore } from "../store/authStore";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim()) { setErro("Informe o e-mail"); return; }
    if (!senha.trim()) { setErro("Informe a senha"); return; }

    setCarregando(true);
    try {
      const resp = await axios.post(
        `${API_URL}/auth/login`,
        { email: email.trim(), senha },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );

      const { usuario, accessToken, refreshToken } = resp.data.data;
      setAuth(usuario, accessToken, refreshToken);
      navigate("/");
    } catch (e: any) {
      const status = e.response?.status;
      const msg = e.response?.data?.message;

      if (status === 401) {
        setErro("E-mail ou senha incorretos. Verifique as credenciais.");
      } else if (e.code === "ERR_NETWORK" || !e.response) {
        setErro(`Não foi possível conectar ao servidor (${API_URL}). Verifique se o backend está rodando.`);
      } else {
        setErro(msg ?? `Erro ${status ?? "desconhecido"}: ${e.message}`);
      }
    } finally {
      setCarregando(false);
    }
  };

  const preencherDemo = (tipo: "admin" | "gerente") => {
    setEmail(tipo === "admin" ? "admin@confeccao.com.br" : "gerente@confeccao.com.br");
    setSenha(tipo === "admin" ? "Admin@123" : "Gerente@123");
    setErro(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sistema de Estoque</h1>
          <p className="text-gray-500 mt-1">Confecção Feminina</p>
        </div>

        <Card className="p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar na sua conta</h2>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={carregando}
              />
            </div>

            <div>
              <Label htmlFor="senha">Senha</Label>
              <div className="relative mt-1">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  disabled={carregando}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-3">Credenciais de demonstração:</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => preencherDemo("admin")}
                className="flex-1 text-xs py-2 px-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => preencherDemo("gerente")}
                className="flex-1 text-xs py-2 px-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Gerente
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              API: {API_URL}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";
import {
  ArrowUpCircle, ArrowDownCircle, Store, Laptop, Users, Package,
  RefreshCw, AlertTriangle, ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { useEstoqueStore } from "../../store/estoqueStore";
import { useProdutosStore } from "../../store/produtosStore";
import type { CreateMovimentacaoDto, TipoMovimentacao, Canal } from "../../types";

const CANAL_ICONS: Record<string, React.ElementType> = {
  LOJA_FISICA: Store,
  ONLINE: Laptop,
  REVENDEDORES: Users,
  PRODUCAO: Package,
};

const CANAL_COLORS: Record<string, string> = {
  LOJA_FISICA: "bg-purple-500",
  ONLINE: "bg-blue-500",
  REVENDEDORES: "bg-green-500",
  PRODUCAO: "bg-orange-500",
};

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  TRANSFERENCIA: "Transferência",
  AJUSTE: "Ajuste",
};

function MovimentacaoForm({ onSalvar, onClose }: {
  onSalvar: (dto: CreateMovimentacaoDto) => Promise<void>;
  onClose: () => void;
}) {
  const { locais } = useEstoqueStore();
  const { produtos } = useProdutosStore();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<CreateMovimentacaoDto>({
    tipo: "ENTRADA",
    produtoId: "",
    localDestinoId: "",
    quantidade: 1,
    observacao: "",
  });

  const handleSalvar = async () => {
    if (!form.produtoId || !form.quantidade) {
      toast.error("Produto e quantidade são obrigatórios");
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(form);
      toast.success("Movimentação registrada!");
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Erro ao registrar movimentação");
    } finally {
      setSalvando(false);
    }
  };

  const isEntrada = form.tipo === "ENTRADA";
  const isSaida = form.tipo === "SAIDA";

  return (
    <div className="space-y-4 mt-2">
      <div>
        <Label>Tipo *</Label>
        <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoMovimentacao })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ENTRADA">Entrada</SelectItem>
            <SelectItem value="SAIDA">Saída</SelectItem>
            <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
            <SelectItem value="AJUSTE">Ajuste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Produto *</Label>
        <Select value={form.produtoId} onValueChange={(v) => setForm({ ...form, produtoId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o produto" />
          </SelectTrigger>
          <SelectContent>
            {produtos.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome} ({p.sku})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(isSaida || form.tipo === "TRANSFERENCIA") && (
        <div>
          <Label>Local de Origem *</Label>
          <Select value={form.localOrigemId ?? ""} onValueChange={(v) => setForm({ ...form, localOrigemId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o local de origem" />
            </SelectTrigger>
            <SelectContent>
              {locais.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(isEntrada || form.tipo === "TRANSFERENCIA") && (
        <div>
          <Label>Local de Destino *</Label>
          <Select value={form.localDestinoId ?? ""} onValueChange={(v) => setForm({ ...form, localDestinoId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o local de destino" />
            </SelectTrigger>
            <SelectContent>
              {locais.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Quantidade *</Label>
        <Input
          type="number"
          min="1"
          value={form.quantidade}
          onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
        />
      </div>

      <div>
        <Label>Observação</Label>
        <Input
          placeholder="Opcional"
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button onClick={handleSalvar} disabled={salvando} className="flex-1 bg-blue-500 hover:bg-blue-600">
          {salvando ? "Registrando..." : "Registrar"}
        </Button>
      </div>
    </div>
  );
}

export function Estoque() {
  const {
    movimentacoes, locais, carregando, erro,
    carregarMovimentacoes, carregarLocais, registrarMovimentacao,
  } = useEstoqueStore();
  const { carregarProdutos } = useProdutosStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("todas");

  useEffect(() => {
    carregarLocais();
    carregarMovimentacoes();
    carregarProdutos();
  }, []);

  const handleSalvar = async (dto: CreateMovimentacaoDto) => {
    await registrarMovimentacao(dto);
    carregarMovimentacoes();
  };

  const filtradas = movimentacoes.filter((m) => {
    if (abaAtiva === "todas") return true;
    if (abaAtiva === "entradas") return m.tipo === "ENTRADA";
    if (abaAtiva === "saidas") return m.tipo === "SAIDA";
    return true;
  });

  const tipoConfig = {
    ENTRADA: { icon: ArrowUpCircle, color: "text-green-600", bg: "bg-green-100", badgeVariant: "default" as const },
    SAIDA: { icon: ArrowDownCircle, color: "text-red-600", bg: "bg-red-100", badgeVariant: "destructive" as const },
    TRANSFERENCIA: { icon: ArrowLeftRight, color: "text-blue-600", bg: "bg-blue-100", badgeVariant: "secondary" as const },
    AJUSTE: { icon: Package, color: "text-orange-600", bg: "bg-orange-100", badgeVariant: "outline" as const },
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Controle de Estoque</h2>
            <p className="text-gray-600 mt-1">Gerencie entradas e saídas por canal</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => carregarMovimentacoes()} variant="outline" disabled={carregando}>
              <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Package className="w-4 h-4 mr-2" />
                  Nova Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Movimentação</DialogTitle>
                </DialogHeader>
                <MovimentacaoForm onSalvar={handleSalvar} onClose={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Cards por local */}
        {locais.length > 0 && (
          <div className={`grid grid-cols-1 md:grid-cols-${Math.min(locais.length, 4)} gap-6 mb-8`}>
            {locais.map((local) => {
              const Icon = CANAL_ICONS[local.tipo] ?? Store;
              const color = CANAL_COLORS[local.tipo] ?? "bg-gray-500";
              const totalLocal = movimentacoes
                .filter((m) => m.localDestino?.id === local.id || m.localOrigem?.id === local.id)
                .length;
              return (
                <Card key={local.id} className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-lg ${color}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">{local.nome}</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {local._count?.estoques ?? 0}
                      </p>
                      <p className="text-gray-500 text-xs">itens cadastrados</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Movimentações */}
        <Card className="p-6">
          <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
            <TabsList className="mb-6">
              <TabsTrigger value="todas">Todas ({movimentacoes.length})</TabsTrigger>
              <TabsTrigger value="entradas">Entradas</TabsTrigger>
              <TabsTrigger value="saidas">Saídas</TabsTrigger>
            </TabsList>

            <TabsContent value={abaAtiva}>
              {carregando ? (
                <div className="space-y-3">
                  {[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : erro ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <AlertTriangle className="w-8 h-8 mb-2 text-red-400" />
                  <p>{erro}</p>
                </div>
              ) : filtradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Package className="w-8 h-8 mb-2" />
                  <p>Nenhuma movimentação encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtradas.map((mov) => {
                    const cfg = tipoConfig[mov.tipo] ?? tipoConfig.AJUSTE;
                    const Icon = cfg.icon;
                    const canal = mov.tipo === "ENTRADA"
                      ? mov.localDestino?.nome
                      : mov.localOrigem?.nome;

                    return (
                      <div key={mov.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${cfg.bg}`}>
                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800 text-sm">{mov.produto?.nome}</h4>
                            <p className="text-xs text-gray-500">
                              {canal ?? "—"} {mov.responsavel ? `• ${mov.responsavel.nome}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={cfg.badgeVariant}>
                            {mov.tipo === "ENTRADA" ? "+" : mov.tipo === "SAIDA" ? "-" : ""}
                            {mov.quantidade} un
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(mov.dataMovimentacao).toLocaleDateString("pt-BR")}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {TIPO_LABEL[mov.tipo]}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

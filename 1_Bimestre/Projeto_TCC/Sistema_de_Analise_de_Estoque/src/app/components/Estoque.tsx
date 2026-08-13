import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ArrowUpCircle, ArrowDownCircle, Store, Laptop, Users, Package } from "lucide-react";
import { Badge } from "./ui/badge";

interface MovimentacaoEstoque {
  id: number;
  tipo: "entrada" | "saida";
  produto: string;
  quantidade: number;
  canal: string;
  data: string;
  responsavel: string;
}

export function Estoque() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([
    { id: 1, tipo: "entrada", produto: "Vestido Floral", quantidade: 50, canal: "Produção", data: "2026-04-20", responsavel: "João Silva" },
    { id: 2, tipo: "saida", produto: "Blusa Básica", quantidade: 15, canal: "Loja Física", data: "2026-04-20", responsavel: "Maria Santos" },
    { id: 3, tipo: "saida", produto: "Saia Midi", quantidade: 8, canal: "Online", data: "2026-04-21", responsavel: "Sistema" },
    { id: 4, tipo: "saida", produto: "Calça Jeans", quantidade: 12, canal: "Revendedores", data: "2026-04-21", responsavel: "Pedro Costa" },
    { id: 5, tipo: "entrada", produto: "Vestido Longo", quantidade: 30, canal: "Produção", data: "2026-04-22", responsavel: "João Silva" },
    { id: 6, tipo: "saida", produto: "Blusa Estampada", quantidade: 20, canal: "Online", data: "2026-04-22", responsavel: "Sistema" },
    { id: 7, tipo: "saida", produto: "Saia Plissada", quantidade: 6, canal: "Loja Física", data: "2026-04-23", responsavel: "Maria Santos" },
  ]);

  const [novaMovimentacao, setNovaMovimentacao] = useState({
    tipo: "entrada" as "entrada" | "saida",
    produto: "",
    quantidade: 0,
    canal: "",
    responsavel: "",
  });

  const estoqueCanais = [
    { canal: "Loja Física", total: 342, icon: Store, color: "bg-purple-500" },
    { canal: "Online", total: 589, icon: Laptop, color: "bg-blue-500" },
    { canal: "Revendedores", total: 316, icon: Users, color: "bg-green-500" },
  ];

  const handleAddMovimentacao = () => {
    const nova: MovimentacaoEstoque = {
      id: movimentacoes.length + 1,
      ...novaMovimentacao,
      data: new Date().toISOString().split('T')[0],
    };
    setMovimentacoes([nova, ...movimentacoes]);
    setNovaMovimentacao({
      tipo: "entrada",
      produto: "",
      quantidade: 0,
      canal: "",
      responsavel: "",
    });
  };

  const movimentacoesEntrada = movimentacoes.filter((m) => m.tipo === "entrada");
  const movimentacoesSaida = movimentacoes.filter((m) => m.tipo === "saida");

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Controle de Estoque</h2>
            <p className="text-gray-600 mt-1">Gerencie entradas e saídas por canal</p>
          </div>

          <Dialog>
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
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={novaMovimentacao.tipo}
                    onValueChange={(value) => setNovaMovimentacao({ ...novaMovimentacao, tipo: value as "entrada" | "saida" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Produto</Label>
                  <Input
                    placeholder="Nome do produto"
                    value={novaMovimentacao.produto}
                    onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, produto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={novaMovimentacao.quantidade}
                    onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, quantidade: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Canal</Label>
                  <Select
                    value={novaMovimentacao.canal}
                    onValueChange={(value) => setNovaMovimentacao({ ...novaMovimentacao, canal: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o canal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Produção">Produção</SelectItem>
                      <SelectItem value="Loja Física">Loja Física</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Revendedores">Revendedores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input
                    placeholder="Nome do responsável"
                    value={novaMovimentacao.responsavel}
                    onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, responsavel: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddMovimentacao} className="w-full bg-blue-500 hover:bg-blue-600">
                  Registrar Movimentação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {estoqueCanais.map((canal, index) => {
            const Icon = canal.icon;
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-lg ${canal.color}`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">{canal.canal}</p>
                    <p className="text-3xl font-bold text-gray-800">{canal.total}</p>
                    <p className="text-gray-500 text-sm">unidades</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <Tabs defaultValue="todas">
            <TabsList className="mb-6">
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="entradas">Entradas</TabsTrigger>
              <TabsTrigger value="saidas">Saídas</TabsTrigger>
            </TabsList>

            <TabsContent value="todas">
              <div className="space-y-4">
                {movimentacoes.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${mov.tipo === "entrada" ? "bg-green-100" : "bg-red-100"}`}>
                        {mov.tipo === "entrada" ? (
                          <ArrowUpCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{mov.produto}</h4>
                        <p className="text-sm text-gray-500">
                          {mov.canal} • {mov.responsavel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={mov.tipo === "entrada" ? "default" : "destructive"}>
                        {mov.tipo === "entrada" ? "+" : "-"}{mov.quantidade} unidades
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">{new Date(mov.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="entradas">
              <div className="space-y-4">
                {movimentacoesEntrada.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-green-100">
                        <ArrowUpCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{mov.produto}</h4>
                        <p className="text-sm text-gray-500">
                          {mov.canal} • {mov.responsavel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">+{mov.quantidade} unidades</Badge>
                      <p className="text-sm text-gray-500 mt-1">{new Date(mov.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="saidas">
              <div className="space-y-4">
                {movimentacoesSaida.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-red-100">
                        <ArrowDownCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{mov.produto}</h4>
                        <p className="text-sm text-gray-500">
                          {mov.canal} • {mov.responsavel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">-{mov.quantidade} unidades</Badge>
                      <p className="text-sm text-gray-500 mt-1">{new Date(mov.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

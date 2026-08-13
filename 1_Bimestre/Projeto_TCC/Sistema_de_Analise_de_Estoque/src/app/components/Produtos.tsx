import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";

interface Produto {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  estoque: number;
  precoVenda: number;
  precoProducao: number;
}

export function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([
    { id: 1, codigo: "VE001", nome: "Vestido Floral", categoria: "Vestidos", estoque: 45, precoVenda: 89.90, precoProducao: 35.00 },
    { id: 2, codigo: "BL002", nome: "Blusa Básica", categoria: "Blusas", estoque: 78, precoVenda: 49.90, precoProducao: 20.00 },
    { id: 3, codigo: "SK003", nome: "Saia Midi", categoria: "Saias", estoque: 32, precoVenda: 69.90, precoProducao: 28.00 },
    { id: 4, codigo: "CA004", nome: "Calça Jeans", categoria: "Calças", estoque: 56, precoVenda: 129.90, precoProducao: 55.00 },
    { id: 5, codigo: "VE005", nome: "Vestido Longo", categoria: "Vestidos", estoque: 23, precoVenda: 149.90, precoProducao: 60.00 },
    { id: 6, codigo: "BL006", nome: "Blusa Estampada", categoria: "Blusas", estoque: 67, precoVenda: 59.90, precoProducao: 25.00 },
    { id: 7, codigo: "SK007", nome: "Saia Plissada", categoria: "Saias", estoque: 41, precoVenda: 79.90, precoProducao: 32.00 },
    { id: 8, codigo: "CA008", nome: "Calça Social", categoria: "Calças", estoque: 29, precoVenda: 119.90, precoProducao: 50.00 },
    { id: 9, codigo: "VE009", nome: "Vestido Curto", categoria: "Vestidos", estoque: 38, precoVenda: 79.90, precoProducao: 30.00 },
    { id: 10, codigo: "BL010", nome: "Blusa Listrada", categoria: "Blusas", estoque: 52, precoVenda: 54.90, precoProducao: 22.00 },
  ]);

  const [novoProduto, setNovoProduto] = useState({
    codigo: "",
    nome: "",
    categoria: "",
    estoque: 0,
    precoVenda: 0,
    precoProducao: 0,
  });

  const filteredProdutos = produtos.filter(
    (produto) =>
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduto = () => {
    const novo: Produto = {
      id: produtos.length + 1,
      ...novoProduto,
    };
    setProdutos([...produtos, novo]);
    setNovoProduto({
      codigo: "",
      nome: "",
      categoria: "",
      estoque: 0,
      precoVenda: 0,
      precoProducao: 0,
    });
  };

  const handleDeleteProduto = (id: number) => {
    setProdutos(produtos.filter((p) => p.id !== id));
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Produtos</h2>
            <p className="text-gray-600 mt-1">Gerencie o catálogo de produtos</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Código</Label>
                  <Input
                    placeholder="Ex: VE001"
                    value={novoProduto.codigo}
                    onChange={(e) => setNovoProduto({ ...novoProduto, codigo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input
                    placeholder="Ex: Vestido Floral"
                    value={novoProduto.nome}
                    onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input
                    placeholder="Ex: Vestidos"
                    value={novoProduto.categoria}
                    onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estoque Inicial</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={novoProduto.estoque}
                    onChange={(e) => setNovoProduto({ ...novoProduto, estoque: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Preço de Venda (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={novoProduto.precoVenda}
                    onChange={(e) => setNovoProduto({ ...novoProduto, precoVenda: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Custo de Produção (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={novoProduto.precoProducao}
                    onChange={(e) => setNovoProduto({ ...novoProduto, precoProducao: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={handleAddProduto} className="w-full bg-blue-500 hover:bg-blue-600">
                  Cadastrar Produto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-10"
              placeholder="Buscar por código, nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProdutos.map((produto) => (
            <Card key={produto.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{produto.nome}</h3>
                    <p className="text-sm text-gray-500">{produto.codigo}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteProduto(produto.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Categoria:</span>
                  <span className="font-medium text-gray-800">{produto.categoria}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estoque:</span>
                  <span className="font-medium text-gray-800">{produto.estoque} unidades</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Preço Venda:</span>
                  <span className="font-medium text-green-600">R$ {produto.precoVenda.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Custo Produção:</span>
                  <span className="font-medium text-orange-600">R$ {produto.precoProducao.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600">Margem:</span>
                  <span className="font-bold text-blue-600">
                    {(((produto.precoVenda - produto.precoProducao) / produto.precoVenda) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

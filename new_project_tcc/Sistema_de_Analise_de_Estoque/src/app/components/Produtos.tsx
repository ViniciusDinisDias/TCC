import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, RefreshCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "./ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { useProdutosStore } from "../../store/produtosStore";
import { categoriasService } from "../../services/categoriasService";
import type { Categoria, CreateProdutoDto, Produto } from "../../types";

function ProdutoFormDialog({
  produto,
  categorias,
  onSalvar,
  trigger,
}: {
  produto?: Produto;
  categorias: Categoria[];
  onSalvar: (dto: CreateProdutoDto) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<CreateProdutoDto>({
    sku: produto?.sku ?? "",
    nome: produto?.nome ?? "",
    descricao: produto?.descricao ?? "",
    categoriaId: produto?.categoriaId ?? "",
    precoVenda: produto?.precoVenda ?? 0,
    precoCusto: produto?.precoCusto ?? 0,
    estoqueMinimo: produto?.estoqueMinimo ?? 5,
  });

  const handleSalvar = async () => {
    if (!form.sku || !form.nome || !form.categoriaId) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(form);
      setOpen(false);
      toast.success(produto ? "Produto atualizado!" : "Produto criado!");
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Erro ao salvar produto");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar Produto" : "Cadastrar Novo Produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SKU *</Label>
              <Input
                placeholder="Ex: VE001"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div>
              <Label>Estoque Mínimo</Label>
              <Input
                type="number"
                value={form.estoqueMinimo}
                onChange={(e) => setForm({ ...form, estoqueMinimo: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Nome *</Label>
            <Input
              placeholder="Ex: Vestido Floral"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <Label>Categoria *</Label>
            <Select value={form.categoriaId} onValueChange={(v) => setForm({ ...form, categoriaId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              placeholder="Descrição opcional"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço de Venda (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.precoVenda}
                onChange={(e) => setForm({ ...form, precoVenda: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Custo de Produção (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.precoCusto}
                onChange={(e) => setForm({ ...form, precoCusto: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-500 hover:bg-blue-600">
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Produtos() {
  const { produtos, carregando, erro, termoBusca, setTermoBusca, carregarProdutos, criarProduto, atualizarProduto, removerProduto } = useProdutosStore();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtoParaRemover, setProdutoParaRemover] = useState<Produto | null>(null);

  useEffect(() => {
    carregarProdutos();
    categoriasService.listar().then(setCategorias).catch(() => {});
  }, []);

  const filtrados = produtos.filter((p) => {
    const termo = termoBusca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(termo) ||
      p.sku.toLowerCase().includes(termo) ||
      p.categoria?.nome?.toLowerCase().includes(termo)
    );
  });

  const handleCriar = async (dto: CreateProdutoDto) => {
    await criarProduto(dto);
  };

  const handleAtualizar = (produto: Produto) => async (dto: CreateProdutoDto) => {
    await atualizarProduto(produto.id, dto);
  };

  const handleRemover = async () => {
    if (!produtoParaRemover) return;
    try {
      await removerProduto(produtoParaRemover.id);
      toast.success("Produto removido");
      setProdutoParaRemover(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Erro ao remover produto");
    }
  };

  const calcMargem = (precoVenda: number, precoCusto: number) => {
    if (precoVenda <= 0) return 0;
    return (((precoVenda - precoCusto) / precoVenda) * 100).toFixed(1);
  };

  const totalEstoque = (produto: Produto) =>
    produto.estoques?.reduce((acc, e) => acc + e.quantidadeDisponivel, 0) ?? 0;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Produtos</h2>
            <p className="text-gray-600 mt-1">
              {filtrados.length} de {produtos.length} produtos
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => carregarProdutos()} variant="outline" disabled={carregando}>
              <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <ProdutoFormDialog
              categorias={categorias}
              onSalvar={handleCriar}
              trigger={
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              }
            />
          </div>
        </div>

        <Card className="mb-6 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-10"
              placeholder="Buscar por SKU, nome ou categoria..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </div>
        </Card>

        {carregando && produtos.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : erro ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <AlertTriangle className="w-10 h-10 mb-2 text-red-400" />
            <p>{erro}</p>
            <Button onClick={() => carregarProdutos()} variant="outline" className="mt-3">Tentar novamente</Button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Package className="w-10 h-10 mb-2" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map((produto) => {
              const total = totalEstoque(produto);
              const critico = total <= produto.estoqueMinimo;

              return (
                <Card key={produto.id} className={`p-6 hover:shadow-lg transition-shadow ${critico ? "border-red-200" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${critico ? "bg-red-100" : "bg-blue-100"}`}>
                        <Package className={`w-6 h-6 ${critico ? "text-red-500" : "text-blue-500"}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{produto.nome}</h3>
                        <p className="text-sm text-gray-500">{produto.sku}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <ProdutoFormDialog
                        produto={produto}
                        categorias={categorias}
                        onSalvar={handleAtualizar(produto)}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                        }
                      />
                      <Button variant="ghost" size="sm" onClick={() => setProdutoParaRemover(produto)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Categoria:</span>
                      <Badge variant="secondary">{produto.categoria?.nome}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estoque Total:</span>
                      <span className={`font-medium ${critico ? "text-red-600" : "text-gray-800"}`}>
                        {total} un {critico && "⚠"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estoque Mínimo:</span>
                      <span className="text-gray-600">{produto.estoqueMinimo} un</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Preço Venda:</span>
                      <span className="font-medium text-green-600">
                        R$ {Number(produto.precoVenda).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Custo Produção:</span>
                      <span className="font-medium text-orange-600">
                        R$ {Number(produto.precoCusto).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-gray-600">Margem:</span>
                      <span className="font-bold text-blue-600">
                        {calcMargem(Number(produto.precoVenda), Number(produto.precoCusto))}%
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!produtoParaRemover} onOpenChange={(v) => !v && setProdutoParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover o produto <strong>{produtoParaRemover?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemover} className="bg-red-500 hover:bg-red-600">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

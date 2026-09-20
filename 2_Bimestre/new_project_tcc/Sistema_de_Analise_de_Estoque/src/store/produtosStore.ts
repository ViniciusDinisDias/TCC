import { create } from 'zustand';
import type { Produto, CreateProdutoDto } from '../types';
import { produtosService } from '../services/produtosService';

interface ProdutosStore {
  produtos: Produto[];
  produtoSelecionado: Produto | null;
  carregando: boolean;
  erro: string | null;
  termoBusca: string;

  setTermoBusca: (termo: string) => void;
  carregarProdutos: (params?: { busca?: string; categoriaId?: string }) => Promise<void>;
  criarProduto: (dto: CreateProdutoDto) => Promise<Produto>;
  atualizarProduto: (id: string, dto: Partial<CreateProdutoDto>) => Promise<void>;
  removerProduto: (id: string) => Promise<void>;
  selecionarProduto: (produto: Produto | null) => void;
}

export const useProdutosStore = create<ProdutosStore>((set, get) => ({
  produtos: [],
  produtoSelecionado: null,
  carregando: false,
  erro: null,
  termoBusca: '',

  setTermoBusca: (termoBusca) => set({ termoBusca }),

  carregarProdutos: async (params) => {
    set({ carregando: true, erro: null });
    try {
      const produtos = await produtosService.listar(params);
      set({ produtos });
    } catch (e: any) {
      set({ erro: e.response?.data?.message ?? 'Erro ao carregar produtos' });
    } finally {
      set({ carregando: false });
    }
  },

  criarProduto: async (dto) => {
    const produto = await produtosService.criar(dto);
    set((state) => ({ produtos: [produto, ...state.produtos] }));
    return produto;
  },

  atualizarProduto: async (id, dto) => {
    const atualizado = await produtosService.atualizar(id, dto);
    set((state) => ({
      produtos: state.produtos.map((p) => (p.id === id ? atualizado : p)),
    }));
  },

  removerProduto: async (id) => {
    await produtosService.remover(id);
    set((state) => ({ produtos: state.produtos.filter((p) => p.id !== id) }));
  },

  selecionarProduto: (produtoSelecionado) => set({ produtoSelecionado }),
}));

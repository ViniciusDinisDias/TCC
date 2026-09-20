import { create } from 'zustand';
import type { Movimentacao, CreateMovimentacaoDto, LocalEstoque } from '../types';
import { movimentacoesService, locaisService } from '../services/estoqueService';

interface EstoqueStore {
  movimentacoes: Movimentacao[];
  locais: LocalEstoque[];
  totalMovimentacoes: number;
  pagina: number;
  carregando: boolean;
  erro: string | null;

  carregarLocais: () => Promise<void>;
  carregarMovimentacoes: (params?: {
    produtoId?: string;
    tipo?: string;
    localId?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  registrarMovimentacao: (dto: CreateMovimentacaoDto) => Promise<Movimentacao>;
}

export const useEstoqueStore = create<EstoqueStore>((set) => ({
  movimentacoes: [],
  locais: [],
  totalMovimentacoes: 0,
  pagina: 1,
  carregando: false,
  erro: null,

  carregarLocais: async () => {
    try {
      const locais = await locaisService.listar();
      set({ locais });
    } catch (e: any) {
      set({ erro: e.response?.data?.message ?? 'Erro ao carregar locais' });
    }
  },

  carregarMovimentacoes: async (params = {}) => {
    set({ carregando: true, erro: null });
    try {
      const resultado = await movimentacoesService.listar(params);
      set({
        movimentacoes: resultado.movimentacoes,
        totalMovimentacoes: resultado.total,
        pagina: resultado.page,
      });
    } catch (e: any) {
      set({ erro: e.response?.data?.message ?? 'Erro ao carregar movimentações' });
    } finally {
      set({ carregando: false });
    }
  },

  registrarMovimentacao: async (dto) => {
    const mov = await movimentacoesService.criar(dto);
    set((state) => ({ movimentacoes: [mov, ...state.movimentacoes] }));
    return mov;
  },
}));

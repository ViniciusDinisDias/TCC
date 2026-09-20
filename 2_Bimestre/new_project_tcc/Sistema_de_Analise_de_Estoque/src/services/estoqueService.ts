import { api } from './api';
import type { EstoqueItem, Movimentacao, CreateMovimentacaoDto, LocalEstoque } from '../types';

export const estoqueService = {
  async getVisaoGeral() {
    const { data } = await api.get('/estoque/visao-geral');
    return data.data;
  },

  async listar(params?: { produtoId?: string; localId?: string }): Promise<EstoqueItem[]> {
    const { data } = await api.get('/estoque', { params });
    return data.data;
  },
};

export const movimentacoesService = {
  async listar(params?: {
    produtoId?: string;
    tipo?: string;
    localId?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    const { data } = await api.get('/movimentacoes', { params });
    return data.data;
  },

  async criar(dto: CreateMovimentacaoDto): Promise<Movimentacao> {
    const { data } = await api.post('/movimentacoes', dto);
    return data.data;
  },

  async getResumo(dias?: number) {
    const { data } = await api.get('/movimentacoes/resumo', { params: { dias } });
    return data.data;
  },
};

export const locaisService = {
  async listar(): Promise<LocalEstoque[]> {
    const { data } = await api.get('/locais');
    return data.data;
  },

  async getResumo() {
    const { data } = await api.get('/locais/resumo');
    return data.data;
  },
};

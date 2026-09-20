import { api } from './api';
import type { Produto, CreateProdutoDto } from '../types';

export const produtosService = {
  async listar(params?: { busca?: string; categoriaId?: string }): Promise<Produto[]> {
    const { data } = await api.get('/produtos', { params });
    return data.data;
  },

  async buscarPorId(id: string): Promise<Produto> {
    const { data } = await api.get(`/produtos/${id}`);
    return data.data;
  },

  async criar(dto: CreateProdutoDto): Promise<Produto> {
    const { data } = await api.post('/produtos', dto);
    return data.data;
  },

  async atualizar(id: string, dto: Partial<CreateProdutoDto>): Promise<Produto> {
    const { data } = await api.put(`/produtos/${id}`, dto);
    return data.data;
  },

  async remover(id: string): Promise<void> {
    await api.delete(`/produtos/${id}`);
  },

  async baixoEstoque(): Promise<Produto[]> {
    const { data } = await api.get('/produtos/baixo-estoque');
    return data.data;
  },
};

import { api } from './api';
import type { Categoria } from '../types';

export const categoriasService = {
  async listar(): Promise<Categoria[]> {
    const { data } = await api.get('/categorias');
    return data.data;
  },

  async criar(nome: string, descricao?: string): Promise<Categoria> {
    const { data } = await api.post('/categorias', { nome, descricao });
    return data.data;
  },

  async atualizar(id: string, dto: { nome?: string; descricao?: string }): Promise<Categoria> {
    const { data } = await api.put(`/categorias/${id}`, dto);
    return data.data;
  },

  async remover(id: string): Promise<void> {
    await api.delete(`/categorias/${id}`);
  },
};

import { api } from './api';
import type { AnaliseIA } from '../types';

export const analiseService = {
  async gerarAnalise(periodo?: string): Promise<AnaliseIA> {
    const { data } = await api.post('/analise-ia/gerar', null, { params: { periodo } });
    return data.data;
  },

  async getUltima(): Promise<AnaliseIA> {
    const { data } = await api.get('/analise-ia/ultima');
    return data.data;
  },

  async getHistorico(page?: number, limit?: number) {
    const { data } = await api.get('/analise-ia/historico', { params: { page, limit } });
    return data.data;
  },
};

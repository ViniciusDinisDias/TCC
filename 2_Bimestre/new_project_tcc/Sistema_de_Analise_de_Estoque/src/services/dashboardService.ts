import { api } from './api';
import type { DashboardDados } from '../types';

export const dashboardService = {
  async getDados(): Promise<DashboardDados> {
    const { data } = await api.get('/dashboard');
    return data.data;
  },

  async getMovimentacoesMensais(meses?: number) {
    const { data } = await api.get('/dashboard/movimentacoes-mensais', { params: { meses } });
    return data.data;
  },
};

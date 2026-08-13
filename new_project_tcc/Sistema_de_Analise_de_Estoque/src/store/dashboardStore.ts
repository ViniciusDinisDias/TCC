import { create } from 'zustand';
import type { DashboardDados } from '../types';
import { dashboardService } from '../services/dashboardService';

interface DashboardStore {
  dados: DashboardDados | null;
  carregando: boolean;
  erro: string | null;
  ultimaAtualizacao: Date | null;

  carregarDados: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  dados: null,
  carregando: false,
  erro: null,
  ultimaAtualizacao: null,

  carregarDados: async () => {
    set({ carregando: true, erro: null });
    try {
      const dados = await dashboardService.getDados();
      set({ dados, ultimaAtualizacao: new Date() });
    } catch (e: any) {
      set({ erro: e.response?.data?.message ?? 'Erro ao carregar dashboard' });
    } finally {
      set({ carregando: false });
    }
  },
}));

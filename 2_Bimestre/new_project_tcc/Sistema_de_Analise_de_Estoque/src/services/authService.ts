import { api } from './api';
import type { Usuario, AuthTokens } from '../types';

interface LoginResponse { usuario: Usuario; accessToken: string; refreshToken: string; }

export const authService = {
  async login(email: string, senha: string): Promise<LoginResponse> {
    const { data } = await api.post('/auth/login', { email, senha });
    return data.data;
  },

  async register(payload: {
    empresaId: string;
    nome: string;
    email: string;
    senha: string;
    cargo?: string;
  }): Promise<LoginResponse> {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  },

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<Usuario> {
    const { data } = await api.get('/auth/me');
    return data.data;
  },
};

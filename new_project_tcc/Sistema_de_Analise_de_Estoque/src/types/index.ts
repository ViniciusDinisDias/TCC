// ========================
// AUTH
// ========================
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'ADMIN' | 'GERENTE' | 'OPERADOR';
  cargo?: string;
  empresa?: { id: string; nome: string };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  usuario: Usuario | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// ========================
// CATEGORIAS
// ========================
export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  _count?: { produtos: number };
}

// ========================
// PRODUTOS
// ========================
export type TipoProduto = 'PRODUTO_ACABADO' | 'MATERIA_PRIMA' | 'INSUMO';

export interface Produto {
  id: string;
  sku: string;
  nome: string;
  descricao?: string;
  categoriaId: string;
  categoria?: Categoria;
  unidadeMedida: string;
  tipoProduto: TipoProduto;
  precoVenda: number;
  precoCusto: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  estoques?: EstoqueItem[];
  totalEstoque?: number;
}

export interface CreateProdutoDto {
  sku: string;
  nome: string;
  descricao?: string;
  categoriaId: string;
  unidadeMedida?: string;
  tipoProduto?: TipoProduto;
  precoVenda: number;
  precoCusto: number;
  estoqueMinimo?: number;
  estoqueMaximo?: number;
}

// ========================
// ESTOQUE
// ========================
export type Canal = 'PRODUCAO' | 'LOJA_FISICA' | 'ONLINE' | 'REVENDEDORES' | 'FORNECEDOR';

export interface LocalEstoque {
  id: string;
  nome: string;
  tipo: Canal;
  endereco?: string;
  ativo: boolean;
  _count?: { estoques: number };
}

export interface EstoqueItem {
  id: string;
  produtoId: string;
  localEstoqueId: string;
  quantidadeDisponivel: number;
  quantidadeReservada: number;
  quantidadeMinima: number;
  produto?: Produto;
  localEstoque?: LocalEstoque;
}

// ========================
// MOVIMENTAÇÕES
// ========================
export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  produtoId: string;
  produto?: Pick<Produto, 'id' | 'sku' | 'nome'>;
  localOrigemId?: string;
  localOrigem?: Pick<LocalEstoque, 'id' | 'nome' | 'tipo'>;
  localDestinoId?: string;
  localDestino?: Pick<LocalEstoque, 'id' | 'nome' | 'tipo'>;
  quantidade: number;
  observacao?: string;
  responsavelId?: string;
  responsavel?: { id: string; nome: string };
  dataMovimentacao: string;
  criadoEm: string;
}

export interface CreateMovimentacaoDto {
  tipo: TipoMovimentacao;
  produtoId: string;
  localOrigemId?: string;
  localDestinoId?: string;
  quantidade: number;
  observacao?: string;
}

// ========================
// DASHBOARD
// ========================
export interface DashboardKpis {
  totalProdutos: number;
  totalEmEstoque: number;
  produtosBaixoEstoque: number;
  movimentacoesMes: number;
  variacaoMovimentacoes: string;
  entradasMes: number;
  saidasMes: number;
}

export interface DashboardDados {
  kpis: DashboardKpis;
  estoquePorCanal: Array<{ canal: string; tipo: Canal; total: number }>;
  estoquePorCategoria: Array<{ categoria: string; total: number }>;
  movimentacoesMensais: Array<{ mes: string; entradas: number; saidas: number }>;
  ultimasMovimentacoes: Movimentacao[];
  produtosBaixoEstoque: Array<{
    id: string;
    sku: string;
    nome: string;
    categoria?: string;
    totalEstoque: number;
    estoqueMinimo: number;
  }>;
}

// ========================
// ANÁLISE IA
// ========================
export interface InsightIA {
  tipo: 'tendencia' | 'alerta' | 'oportunidade' | 'performance';
  titulo: string;
  descricao: string;
  prioridade: 'critica' | 'alta' | 'media' | 'baixa';
  dados?: Record<string, any>;
}

export interface PrevisaoIA {
  mes: string;
  totalPrevisto: number;
  confianca: number;
  fatores: string[];
}

export interface RecomendacaoIA {
  titulo: string;
  descricao: string;
  impacto: 'alto' | 'medio' | 'baixo';
  prazo: 'imediato' | 'curto' | 'medio' | 'longo';
}

export interface AnaliseIA {
  id: string;
  periodo: string;
  criadoEm: string;
  contexto?: {
    totalProdutos: number;
    totalEmEstoque: number;
    produtosBaixoEstoque: number;
    estoqueValorTotal: number;
  };
  insights: InsightIA[];
  previsoes: PrevisaoIA[];
  recomendacoes: RecomendacaoIA[];
}

// ========================
// API
// ========================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

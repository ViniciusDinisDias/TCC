import { PrismaClient, Papel, TipoProduto, Canal, TipoMovimentacao } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Empresa
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '12.345.678/0001-99' },
    update: {},
    create: {
      nome: 'Confecção Feminina Ltda',
      cnpj: '12.345.678/0001-99',
      razaoSocial: 'Confecção Feminina Ltda',
      telefone: '(11) 99999-0000',
      email: 'contato@confeccao.com.br',
      endereco: 'Rua das Flores, 100 - São Paulo/SP',
    },
  });

  // Admin
  const senhaHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@confeccao.com.br' },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: 'Administrador',
      email: 'admin@confeccao.com.br',
      senhaHash,
      cargo: 'Administrador',
      papel: Papel.ADMIN,
    },
  });

  // Gerente
  const senhaGerente = await bcrypt.hash('Gerente@123', 10);
  await prisma.usuario.upsert({
    where: { email: 'gerente@confeccao.com.br' },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: 'Maria Santos',
      email: 'gerente@confeccao.com.br',
      senhaHash: senhaGerente,
      cargo: 'Gerente de Estoque',
      papel: Papel.GERENTE,
    },
  });

  // Categorias
  const categorias = [
    { nome: 'Vestidos', descricao: 'Vestidos femininos' },
    { nome: 'Blusas', descricao: 'Blusas femininas' },
    { nome: 'Saias', descricao: 'Saias femininas' },
    { nome: 'Calças', descricao: 'Calças femininas' },
    { nome: 'Acessórios', descricao: 'Acessórios e complementos' },
    { nome: 'Matéria Prima', descricao: 'Tecidos e insumos' },
  ];

  const categoriasMap: Record<string, string> = {};
  for (const cat of categorias) {
    const c = await prisma.categoriaProduto.upsert({
      where: { nome: cat.nome },
      update: {},
      create: cat,
    });
    categoriasMap[cat.nome] = c.id;
  }

  // Locais de Estoque
  const locais = [
    { nome: 'Loja Física - Centro', tipo: Canal.LOJA_FISICA, endereco: 'Rua das Flores, 100' },
    { nome: 'Estoque Online', tipo: Canal.ONLINE, endereco: 'Galpão Logístico' },
    { nome: 'Revendedores', tipo: Canal.REVENDEDORES },
    { nome: 'Produção / Depósito', tipo: Canal.PRODUCAO, endereco: 'Galpão Principal' },
  ];

  const locaisMap: Record<string, string> = {};
  for (const local of locais) {
    const l = await prisma.localEstoque.upsert({
      where: { id: `local-${local.nome.replace(/\s/g, '-').toLowerCase()}` },
      update: {},
      create: { ...local, id: `local-${local.nome.replace(/\s/g, '-').toLowerCase()}`, empresaId: empresa.id },
    });
    locaisMap[local.nome] = l.id;
  }

  // Produtos
  const produtos = [
    { sku: 'VE001', nome: 'Vestido Floral', categoria: 'Vestidos', precoVenda: 89.90, precoCusto: 35.00 },
    { sku: 'VE002', nome: 'Vestido Longo', categoria: 'Vestidos', precoVenda: 149.90, precoCusto: 60.00 },
    { sku: 'VE003', nome: 'Vestido Curto', categoria: 'Vestidos', precoVenda: 79.90, precoCusto: 30.00 },
    { sku: 'BL001', nome: 'Blusa Básica', categoria: 'Blusas', precoVenda: 49.90, precoCusto: 20.00 },
    { sku: 'BL002', nome: 'Blusa Estampada', categoria: 'Blusas', precoVenda: 59.90, precoCusto: 25.00 },
    { sku: 'BL003', nome: 'Blusa Listrada', categoria: 'Blusas', precoVenda: 54.90, precoCusto: 22.00 },
    { sku: 'SK001', nome: 'Saia Midi', categoria: 'Saias', precoVenda: 69.90, precoCusto: 28.00 },
    { sku: 'SK002', nome: 'Saia Plissada', categoria: 'Saias', precoVenda: 79.90, precoCusto: 32.00 },
    { sku: 'CA001', nome: 'Calça Jeans', categoria: 'Calças', precoVenda: 129.90, precoCusto: 55.00 },
    { sku: 'CA002', nome: 'Calça Social', categoria: 'Calças', precoVenda: 119.90, precoCusto: 50.00 },
  ];

  const produtosMap: Record<string, string> = {};
  for (const p of produtos) {
    const prod = await prisma.produto.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        nome: p.nome,
        categoriaId: categoriasMap[p.categoria],
        tipoProduto: TipoProduto.PRODUTO_ACABADO,
        precoVenda: p.precoVenda,
        precoCusto: p.precoCusto,
        estoqueMinimo: 10,
      },
    });
    produtosMap[p.sku] = prod.id;

    // Criar estoque em cada local
    for (const [nomeLocal, localId] of Object.entries(locaisMap)) {
      const qtd = Math.floor(Math.random() * 80) + 10;
      await prisma.estoque.upsert({
        where: { produtoId_localEstoqueId: { produtoId: prod.id, localEstoqueId: localId } },
        update: {},
        create: {
          produtoId: prod.id,
          localEstoqueId: localId,
          quantidadeDisponivel: qtd,
          quantidadeMinima: 5,
        },
      });
    }
  }

  // Movimentações históricas
  const movimentacoes = [
    { tipo: TipoMovimentacao.ENTRADA, skuProduto: 'VE001', localDestino: 'Produção / Depósito', quantidade: 50 },
    { tipo: TipoMovimentacao.SAIDA, skuProduto: 'BL001', localOrigem: 'Loja Física - Centro', quantidade: 15 },
    { tipo: TipoMovimentacao.SAIDA, skuProduto: 'SK001', localOrigem: 'Estoque Online', quantidade: 8 },
    { tipo: TipoMovimentacao.SAIDA, skuProduto: 'CA001', localOrigem: 'Revendedores', quantidade: 12 },
    { tipo: TipoMovimentacao.ENTRADA, skuProduto: 'VE002', localDestino: 'Produção / Depósito', quantidade: 30 },
    { tipo: TipoMovimentacao.SAIDA, skuProduto: 'BL002', localOrigem: 'Estoque Online', quantidade: 20 },
    { tipo: TipoMovimentacao.SAIDA, skuProduto: 'SK002', localOrigem: 'Loja Física - Centro', quantidade: 6 },
  ];

  for (const mov of movimentacoes) {
    await prisma.movimentacaoEstoque.create({
      data: {
        tipo: mov.tipo,
        produtoId: produtosMap[mov.skuProduto],
        localOrigemId: mov.localOrigem ? locaisMap[mov.localOrigem] : null,
        localDestinoId: mov.localDestino ? locaisMap[mov.localDestino] : null,
        quantidade: mov.quantidade,
        responsavelId: admin.id,
      },
    });
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log('\n📧 Credenciais de acesso:');
  console.log('Admin: admin@confeccao.com.br / Admin@123');
  console.log('Gerente: gerente@confeccao.com.br / Gerente@123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

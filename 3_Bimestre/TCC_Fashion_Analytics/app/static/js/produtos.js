let produtosCache = [];

function iconeEditar() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
}

function iconeExcluir() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
}

function classeEstoque(produto) {
  if (produto.quantidade_estoque <= 0) return "estoque-critico";
  if (produto.quantidade_estoque <= produto.estoque_minimo) return "estoque-atencao";
  return "";
}

function renderizarGrade(lista) {
  const grade = document.getElementById("grade-produtos");
  if (!lista.length) {
    grade.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }
  const podeEditar = window.PAPEL_USUARIO === "admin";
  grade.innerHTML = lista
    .map((produto) => `
      <div class="produto-card">
        <div class="produto-card-cabecalho">
          <div>
            <div class="produto-card-nome">${escaparHtml(produto.nome)}</div>
            <div class="produto-card-sku">${escaparHtml(produto.sku)}</div>
          </div>
        </div>
        <div class="produto-card-linhas">
          <div class="produto-card-linha"><span>Categoria</span><span class="categoria-pill">${escaparHtml(produto.categoria)}</span></div>
          <div class="produto-card-linha"><span>Estoque atual</span><span class="${classeEstoque(produto)}">${produto.quantidade_estoque}</span></div>
          <div class="produto-card-linha"><span>Preço</span><span>R$ ${produto.preco.toFixed(2)}</span></div>
        </div>
        ${podeEditar ? `
        <div class="produto-card-acoes">
          <button type="button" class="produto-acao-btn editar" data-id="${produto.id}" aria-label="Editar produto">${iconeEditar()}</button>
          <button type="button" class="produto-acao-btn excluir" data-id="${produto.id}" aria-label="Excluir produto">${iconeExcluir()}</button>
        </div>` : ""}
      </div>
    `)
    .join("");
}

function filtrarProdutos(termo) {
  const termoBusca = termo.trim().toLowerCase();
  if (!termoBusca) return produtosCache;
  return produtosCache.filter((produto) =>
    produto.nome.toLowerCase().includes(termoBusca) || produto.sku.toLowerCase().includes(termoBusca)
  );
}

function skeletonProdutoCard() {
  return `
    <div class="produto-card skeleton-card">
      <div class="produto-card-cabecalho">
        <div style="flex:1;">
          <div class="skeleton skeleton-line md" style="margin-bottom:.4rem;"></div>
          <div class="skeleton skeleton-line sm"></div>
        </div>
      </div>
      <div class="produto-card-linhas">
        <div class="skeleton skeleton-line lg"></div>
        <div class="skeleton skeleton-line lg"></div>
        <div class="skeleton skeleton-line lg"></div>
      </div>
      <div class="produto-card-acoes">
        <div class="skeleton skeleton-btn" style="flex:1;"></div>
        <div class="skeleton skeleton-btn" style="flex:1;"></div>
      </div>
    </div>
  `;
}

function renderizarSkeletonProdutos() {
  const grade = document.getElementById("grade-produtos");
  grade.innerHTML = Array.from({ length: 8 }).map(skeletonProdutoCard).join("");
}

async function carregarProdutos() {
  renderizarSkeletonProdutos();
  produtosCache = await chamarApi("/produtos");
  const termo = document.getElementById("busca-produto").value;
  renderizarGrade(filtrarProdutos(termo));
}

document.getElementById("busca-produto").addEventListener("input", (evento) => {
  renderizarGrade(filtrarProdutos(evento.target.value));
});

const modalOverlay = document.getElementById("modal-produto-overlay");
const formProduto = document.getElementById("form-produto");
const modalTitulo = document.getElementById("modal-produto-titulo");

function abrirModalNovo() {
  formProduto.reset();
  document.getElementById("produto-id").value = "";
  document.getElementById("produto-estoque-minimo").value = 5;
  modalTitulo.textContent = "Novo produto";
  modalOverlay.hidden = false;
}

function abrirModalEdicao(produto) {
  document.getElementById("produto-id").value = produto.id;
  document.getElementById("produto-sku").value = produto.sku;
  document.getElementById("produto-nome").value = produto.nome;
  document.getElementById("produto-categoria").value = produto.categoria;
  document.getElementById("produto-tamanho").value = produto.tamanho;
  document.getElementById("produto-cor").value = produto.cor;
  document.getElementById("produto-preco").value = produto.preco;
  document.getElementById("produto-quantidade").value = produto.quantidade_estoque;
  document.getElementById("produto-estoque-minimo").value = produto.estoque_minimo;
  modalTitulo.textContent = "Editar produto";
  modalOverlay.hidden = false;
}

function fecharModal() {
  modalOverlay.hidden = true;
}

document.getElementById("botao-novo-produto")?.addEventListener("click", abrirModalNovo);
document.getElementById("botao-fechar-modal").addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", (evento) => {
  if (evento.target === modalOverlay) fecharModal();
});

formProduto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const id = document.getElementById("produto-id").value;
  const dados = {
    sku: document.getElementById("produto-sku").value,
    nome: document.getElementById("produto-nome").value,
    categoria: document.getElementById("produto-categoria").value,
    tamanho: document.getElementById("produto-tamanho").value,
    cor: document.getElementById("produto-cor").value,
    preco: parseFloat(document.getElementById("produto-preco").value),
    quantidade_estoque: parseInt(document.getElementById("produto-quantidade").value, 10),
    estoque_minimo: parseInt(document.getElementById("produto-estoque-minimo").value, 10),
  };
  try {
    if (id) {
      await chamarApi(`/produtos/${id}`, { method: "PUT", body: JSON.stringify(dados) });
      exibirToast("Produto atualizado com sucesso!");
    } else {
      await chamarApi("/produtos", { method: "POST", body: JSON.stringify(dados) });
      exibirToast("Produto criado com sucesso!");
    }
    fecharModal();
    await carregarProdutos();
  } catch (erro) {
    await exibirMensagem(erro.message, "Erro");
  }
});

document.getElementById("grade-produtos").addEventListener("click", async (evento) => {
  const botao = evento.target.closest("button[data-id]");
  if (!botao) return;
  const id = botao.dataset.id;

  if (botao.classList.contains("excluir")) {
    if (!(await confirmarAcao("Tem certeza que deseja excluir este produto?"))) return;
    try {
      await chamarApi(`/produtos/${id}`, { method: "DELETE" });
      exibirToast("Produto excluído com sucesso!");
      await carregarProdutos();
    } catch (erro) {
      await exibirMensagem(erro.message, "Não foi possível excluir");
    }
  }

  if (botao.classList.contains("editar")) {
    const produto = await chamarApi(`/produtos/${id}`);
    abrirModalEdicao(produto);
  }
});

carregarProdutos();
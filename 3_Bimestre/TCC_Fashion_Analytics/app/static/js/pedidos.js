let pedidosCache = [];
let produtosDisponiveis = [];
const CANAL_ROTULOS = { loja_fisica: "Loja física", shopee: "Shopee" };

const STATUS_POR_CANAL = {
  loja_fisica: ["vendido", "reservado"],
  shopee: ["pendente", "cancelado", "enviado", "entregue"],
};

const STATUS_ROTULOS = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  vendido: "Vendido",
  reservado: "Reservado",
};

function iconeEditar() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
}
function iconeExcluir() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
}

function opcoesStatusPara(canal, statusAtual) {
  const lista = STATUS_POR_CANAL[canal] ? [...STATUS_POR_CANAL[canal]] : Object.keys(STATUS_ROTULOS);
  if (statusAtual && !lista.includes(statusAtual)) lista.push(statusAtual);
  return lista
    .map((s) => `<option value="${s}" ${s === statusAtual ? "selected" : ""}>${escaparHtml(STATUS_ROTULOS[s] || s)}</option>`)
    .join("");
}

function nomeProduto(produtoId) {
  const produto = produtosDisponiveis.find((p) => p.id === produtoId);
  return produto ? produto.nome : `Produto #${produtoId}`;
}

function resumoItens(itens) {
  if (!itens || !itens.length) return "";
  const MAX_VISIVEL = 2;
  const nomes = itens.slice(0, MAX_VISIVEL).map((item) => `${item.quantidade}× ${escaparHtml(nomeProduto(item.produto_id))}`);
  const restantes = itens.length - MAX_VISIVEL;
  const texto = nomes.join(", ") + (restantes > 0 ? ` · +${restantes} ${restantes === 1 ? "outro" : "outros"}` : "");
  return `<div class="pedido-card-itens" title="${itens.map((i) => `${i.quantidade}x ${escaparHtml(nomeProduto(i.produto_id))}`).join(", ")}">${texto}</div>`;
}

function renderizarGrade(lista) {
  const grade = document.getElementById("grade-pedidos");
  if (!lista.length) {
    grade.innerHTML = "<p>Nenhum pedido encontrado.</p>";
    return;
  }
  const podeEditar = window.PAPEL_USUARIO === "admin";
  grade.innerHTML = lista
    .map((pedido) => {
      const pendente = pedido.status === "pendente";
      return `
      <div class="pedido-card ${pendente ? "pedido-card-pendente" : ""}">
        <div class="pedido-card-cabecalho">
          <div>
            <div class="pedido-card-cliente">${escaparHtml(pedido.cliente_nome)}</div>
            <div class="pedido-card-meta"><span class="canal-pill">${escaparHtml(CANAL_ROTULOS[pedido.canal] || pedido.canal)}</span> <span class="pedido-card-data">${new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}</span></div>
          </div>
          ${podeEditar ? `<button type="button" class="icon-btn editar" data-id="${pedido.id}" aria-label="Editar pedido">${iconeEditar()}</button>` : ""}
        </div>
        ${resumoItens(pedido.itens)}
        <div class="pedido-card-valor">R$ ${pedido.valor_total.toFixed(2)}</div>
        <div class="pedido-card-rodape">
          <select class="status-select mudar-status ${pedido.status}" data-id="${pedido.id}" ${podeEditar ? "" : "disabled"}>${opcoesStatusPara(pedido.canal, pedido.status)}</select>
        </div>
        ${podeEditar ? `
        <div class="pedido-card-acoes-secundarias">
          <button type="button" class="link-excluir" data-id="${pedido.id}" aria-label="Excluir pedido">${iconeExcluir()} Excluir pedido</button>
        </div>` : ""}
      </div>
    `;
    })
    .join("");
}

function filtrarPedidos(termo) {
  const termoBusca = termo.trim().toLowerCase();
  if (!termoBusca) return pedidosCache;
  return pedidosCache.filter((pedido) => {
    const canalRotulo = (CANAL_ROTULOS[pedido.canal] || pedido.canal).toLowerCase();
    return pedido.cliente_nome.toLowerCase().includes(termoBusca) || canalRotulo.includes(termoBusca);
  });
}

function skeletonPedidoCard() {
  return `
    <div class="pedido-card skeleton-card">
      <div class="pedido-card-cabecalho">
        <div style="flex:1;">
          <div class="skeleton skeleton-line md" style="margin-bottom:.4rem;"></div>
          <div class="skeleton skeleton-line sm"></div>
        </div>
        <div class="skeleton skeleton-avatar"></div>
      </div>
      <div class="skeleton skeleton-line md" style="height:20px;"></div>
      <div class="skeleton skeleton-btn"></div>
    </div>
  `;
}

function renderizarSkeletonPedidos() {
  document.getElementById("grade-pedidos").innerHTML = Array.from({ length: 8 }).map(skeletonPedidoCard).join("");
}

async function carregarPedidos() {
  renderizarSkeletonPedidos();
  pedidosCache = await chamarApi("/pedidos");
  const termo = document.getElementById("busca-pedido").value;
  renderizarGrade(filtrarPedidos(termo));
}

document.getElementById("busca-pedido").addEventListener("input", (evento) => {
  renderizarGrade(filtrarPedidos(evento.target.value));
});

const itensContainer = document.getElementById("itens-pedido");
const formPedido = document.getElementById("form-pedido");
const modalOverlay = document.getElementById("modal-pedido-overlay");
const modalTitulo = document.getElementById("modal-pedido-titulo");
const botaoSalvar = document.getElementById("botao-salvar-pedido");
const campoCanal = document.getElementById("pedido-canal");
const campoStatus = document.getElementById("pedido-status");

/** Cria uma linha de item. Se `preset` for passado ({produtoId, quantidade}),
 * a linha já nasce preenchida — usado na edição de um pedido existente. */
function criarLinhaItem(preset) {
  const linha = document.createElement("div");
  linha.className = "item-card";
  const opcoesProdutos = produtosDisponiveis
    .map((p) => `<option value="${p.id}" ${preset && preset.produtoId === p.id ? "selected" : ""}>${escaparHtml(p.nome)} (${escaparHtml(p.sku)})</option>`)
    .join("");
  linha.innerHTML = `
    <select class="item-produto">${opcoesProdutos}</select>
    <div class="qtd-stepper">
      <button type="button" class="qtd-btn qtd-menos" aria-label="Diminuir">−</button>
      <input type="number" class="item-quantidade" min="1" value="${preset ? preset.quantidade : 1}" required>
      <button type="button" class="qtd-btn qtd-mais" aria-label="Aumentar">+</button>
    </div>
    <button type="button" class="icon-btn excluir remover-item" aria-label="Remover item">${iconeExcluir()}</button>
  `;
  const input = linha.querySelector(".item-quantidade");
  linha.querySelector(".qtd-menos").addEventListener("click", () => {
    input.value = Math.max(1, parseInt(input.value || 1, 10) - 1);
  });
  linha.querySelector(".qtd-mais").addEventListener("click", () => {
    input.value = parseInt(input.value || 1, 10) + 1;
  });
  linha.querySelector(".remover-item").addEventListener("click", () => linha.remove());
  itensContainer.appendChild(linha);
}

document.getElementById("adicionar-item").addEventListener("click", () => criarLinhaItem());

async function carregarProdutosDisponiveis() {
  produtosDisponiveis = await chamarApi("/produtos");
}

campoCanal.addEventListener("change", () => {
  campoStatus.innerHTML = opcoesStatusPara(campoCanal.value, null);
});

function abrirModalNovoPedido() {
  formPedido.reset();
  document.getElementById("pedido-id").value = "";
  itensContainer.innerHTML = "";
  criarLinhaItem();
  campoCanal.disabled = false;
  campoCanal.classList.remove("canal-travado");
  campoStatus.innerHTML = opcoesStatusPara(campoCanal.value, null);
  modalTitulo.textContent = "Novo pedido";
  botaoSalvar.textContent = "Criar pedido";
  modalOverlay.hidden = false;
}

function abrirModalEdicaoPedido(pedido) {
  document.getElementById("pedido-id").value = pedido.id;
  document.getElementById("pedido-cliente-nome").value = pedido.cliente_nome;
  document.getElementById("pedido-cliente-contato").value = pedido.cliente_contato || "";
  campoCanal.value = pedido.canal;
  campoCanal.disabled = true; // canal não muda depois de criado
  campoCanal.classList.add("canal-travado");
  campoStatus.innerHTML = opcoesStatusPara(pedido.canal, pedido.status);

  itensContainer.innerHTML = "";
  (pedido.itens || []).forEach((item) => criarLinhaItem({ produtoId: item.produto_id, quantidade: item.quantidade }));
  if (!pedido.itens || !pedido.itens.length) criarLinhaItem();

  modalTitulo.textContent = "Editar pedido";
  botaoSalvar.textContent = "Salvar alterações";
  modalOverlay.hidden = false;
}

function fecharModal() {
  modalOverlay.hidden = true;
}

document.getElementById("botao-novo-pedido")?.addEventListener("click", abrirModalNovoPedido);
document.getElementById("botao-fechar-modal-pedido").addEventListener("click", fecharModal);
document.getElementById("botao-cancelar-pedido").addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", (evento) => {
  if (evento.target === modalOverlay) fecharModal();
});

formPedido.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const id = document.getElementById("pedido-id").value;

  const itens = Array.from(itensContainer.querySelectorAll(".item-card")).map((linha) => ({
    produto_id: parseInt(linha.querySelector(".item-produto").value, 10),
    quantidade: parseInt(linha.querySelector(".item-quantidade").value, 10),
  }));

  const dados = {
    cliente_nome: document.getElementById("pedido-cliente-nome").value,
    cliente_contato: document.getElementById("pedido-cliente-contato").value,
    status: campoStatus.value,
    itens,
  };
  if (!id) dados.canal = campoCanal.value;

  try {
    if (id) {
      await chamarApi(`/pedidos/${id}`, { method: "PUT", body: JSON.stringify(dados) });
      exibirToast("Pedido atualizado com sucesso!");
    } else {
      await chamarApi("/pedidos", { method: "POST", body: JSON.stringify(dados) });
      exibirToast("Pedido criado com sucesso!");
    }
    fecharModal();
    await carregarPedidos();
  } catch (erro) {
    await exibirMensagem(erro.message, "Erro");
  }
});

document.getElementById("grade-pedidos").addEventListener("click", async (evento) => {
  const botaoEditar = evento.target.closest("button.editar[data-id]");
  const botaoExcluir = evento.target.closest("button.link-excluir[data-id]");

  if (botaoExcluir) {
    const id = botaoExcluir.dataset.id;
    if (!(await confirmarAcao("Tem certeza que deseja excluir este pedido?"))) return;
    try {
      await chamarApi(`/pedidos/${id}`, { method: "DELETE" });
      exibirToast("Pedido excluído com sucesso!");
      await carregarPedidos();
    } catch (erro) {
      await exibirMensagem(erro.message, "Não foi possível excluir");
    }
    return;
  }

  if (botaoEditar) {
    const pedido = await chamarApi(`/pedidos/${botaoEditar.dataset.id}`);
    abrirModalEdicaoPedido(pedido);
  }
});

document.getElementById("grade-pedidos").addEventListener("change", async (evento) => {
  if (!evento.target.classList.contains("mudar-status")) return;
  try {
    await chamarApi(`/pedidos/${evento.target.dataset.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: evento.target.value }),
    });
    exibirToast("Status do pedido atualizado!");
    await carregarPedidos();
  } catch (erro) {
    await exibirMensagem(erro.message, "Não foi possível atualizar o status");
    await carregarPedidos();
  }
});

(async function iniciar() {
  await carregarProdutosDisponiveis();
  await carregarPedidos();
})();
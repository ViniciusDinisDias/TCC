let estoqueCache = [];

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Mesma lógica de severidade usada em Produtos, aplicada aqui à tabela de estoque. */
function severidadeEstoque(produto) {
  if (produto.quantidade_estoque <= 0) return "critical";
  if (produto.quantidade_estoque <= (produto.estoque_minimo ?? 5)) return "warning";
  return "ok";
}

const ROTULO_SEVERIDADE = { critical: "Sem estoque", warning: "Estoque baixo", ok: "OK" };
const CLASSE_TEXTO_SEVERIDADE = { critical: "estoque-critico", warning: "estoque-atencao", ok: "" };

function iconeCaixa() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>`;
}
function iconeAlerta() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>`;
}
function iconeSemEstoque() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>`;
}
function iconeLista() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;
}

function renderizarKpis(lista, valorTotal) {
  const baixo = lista.filter((p) => severidadeEstoque(p) === "warning").length;
  const zerado = lista.filter((p) => severidadeEstoque(p) === "critical").length;

  document.getElementById("kpis-estoque").innerHTML = `
    <div class="kpi kpi-faturamento">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Valor total em estoque</div>
        <div class="kpi-icone">${iconeCaixa()}</div>
      </div>
      <div class="kpi-valor">R$ ${formatarMoeda(valorTotal)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Produtos cadastrados</div>
        <div class="kpi-icone">${iconeLista()}</div>
      </div>
      <div class="kpi-valor">${lista.length}</div>
    </div>
    <div class="kpi">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Estoque baixo</div>
        <div class="kpi-icone" style="background:var(--warning-soft);color:var(--warning);">${iconeAlerta()}</div>
      </div>
      <div class="kpi-valor">${baixo}</div>
    </div>
    <div class="kpi">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Sem estoque</div>
        <div class="kpi-icone" style="background:var(--critical-soft);color:var(--critical);">${iconeSemEstoque()}</div>
      </div>
      <div class="kpi-valor">${zerado}</div>
    </div>
  `;
}

function renderizarTabela(lista) {
  const tabela = document.getElementById("tabela-estoque");
  if (!lista.length) {
    tabela.innerHTML = `<tr><td colspan="5">Nenhum produto encontrado.</td></tr>`;
    return;
  }
  tabela.innerHTML = lista
    .map((produto) => {
      const severidade = severidadeEstoque(produto);
      return `
      <tr>
        <td>${escaparHtml(produto.nome)}</td>
        <td class="${CLASSE_TEXTO_SEVERIDADE[severidade]}">${produto.quantidade_estoque}</td>
        <td>R$ ${formatarMoeda(produto.preco)}</td>
        <td>R$ ${formatarMoeda(produto.valor_estoque)}</td>
        <td>${severidade === "ok" ? `<span class="tag-severidade ok">OK</span>` : `<span class="tag-severidade ${severidade}">${ROTULO_SEVERIDADE[severidade]}</span>`}</td>
      </tr>
    `;
    })
    .join("");
}

function listaFiltrada() {
  const termo = document.getElementById("busca-estoque").value.trim().toLowerCase();
  const somenteBaixo = document.getElementById("filtro-estoque-baixo").checked;
  return estoqueCache
    .filter((p) => !termo || p.nome.toLowerCase().includes(termo))
    .filter((p) => !somenteBaixo || severidadeEstoque(p) !== "ok");
}

function ordenarPorSeveridade(lista) {
  const peso = { critical: 0, warning: 1, ok: 2 };
  return [...lista].sort((a, b) => peso[severidadeEstoque(a)] - peso[severidadeEstoque(b)] || a.nome.localeCompare(b.nome));
}

function atualizarTabela() {
  renderizarTabela(ordenarPorSeveridade(listaFiltrada()));
}

function skeletonLinha() {
  return `
    <tr>
      <td><div class="skeleton skeleton-line md"></div></td>
      <td><div class="skeleton skeleton-line sm"></div></td>
      <td><div class="skeleton skeleton-line sm"></div></td>
      <td><div class="skeleton skeleton-line sm"></div></td>
      <td><div class="skeleton skeleton-line sm"></div></td>
    </tr>
  `;
}

async function carregarEstoque() {
  document.getElementById("tabela-estoque").innerHTML = Array.from({ length: 6 }).map(skeletonLinha).join("");

  const resumo = await chamarApi("/estoque/resumo");
  estoqueCache = resumo.produtos;

  renderizarKpis(estoqueCache, resumo.valor_total_estoque);
  atualizarTabela();
}

document.getElementById("busca-estoque").addEventListener("input", atualizarTabela);
document.getElementById("filtro-estoque-baixo").addEventListener("change", atualizarTabela);

carregarEstoque();
let graficoFaturamento = null;
let graficoTopProdutos = null;

const ROTULO_CANAL = { loja_fisica: "Loja física", shopee: "Shopee" };

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function mostrarEstadoVazio() {
  document.getElementById("ia-vazio").hidden = false;
  document.getElementById("ia-carregando").hidden = true;
  document.getElementById("ia-resultado").hidden = true;
}

function mostrarCarregando() {
  document.getElementById("ia-vazio").hidden = true;
  document.getElementById("ia-carregando").hidden = false;
  document.getElementById("ia-resultado").hidden = true;
}

function mostrarResultado() {
  document.getElementById("ia-vazio").hidden = true;
  document.getElementById("ia-carregando").hidden = true;
  document.getElementById("ia-resultado").hidden = false;
}

function criarGradiente(ctx, area, corInicio, corFim) {
  const gradiente = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradiente.addColorStop(0, corInicio);
  gradiente.addColorStop(1, corFim);
  return gradiente;
}

const ICONE_SEVERIDADE = {
  alta: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>`,
  media: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  baixa: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
};
const ROTULO_SEVERIDADE = { alta: "Crítica", media: "Atenção", baixa: "Informativa" };

/** Monta os chips de contagem ("3 críticas · 1 atenção") acima de uma lista. */
function renderizarResumoSeveridade(containerId, itens, campoSeveridade) {
  const container = document.getElementById(containerId);
  if (!itens || !itens.length) {
    container.innerHTML = "";
    return;
  }
  const contagem = { alta: 0, media: 0, baixa: 0 };
  itens.forEach((item) => {
    const s = item[campoSeveridade];
    if (contagem[s] !== undefined) contagem[s] += 1;
  });
  container.innerHTML = ["alta", "media", "baixa"]
    .filter((s) => contagem[s] > 0)
    .map((s) => `<span class="chip-severidade ${s}">${ICONE_SEVERIDADE[s]} <span class="contagem">${contagem[s]}</span> ${ROTULO_SEVERIDADE[s]}${contagem[s] > 1 ? "s" : ""}</span>`)
    .join("");
}

function renderizarCards(containerId, itens, campoSeveridade) {
  const container = document.getElementById(containerId);
  if (!itens || !itens.length) {
    container.innerHTML = "<p>Nenhum item no momento.</p>";
    return;
  }
  container.innerHTML = itens
    .map((item) => {
      const severidade = item[campoSeveridade] || "baixa";
      return `
      <div class="alerta-ia alerta-ia-${severidade}">
        <span class="selo-ia">${ICONE_SEVERIDADE[severidade] || ICONE_SEVERIDADE.baixa}</span>
        <div class="alerta-ia-corpo">
          <strong>${escaparHtml(item.titulo)}</strong>
          <p>${escaparHtml(item.descricao)}</p>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderizarAnalise(analise) {
  mostrarResultado();

  const dados = analise.kpis.dados_calculados;
  const faturamentoTotal = Object.values(dados.faturamento_por_canal).reduce((soma, v) => soma + v, 0);
  const produtoTop = dados.top_produtos_mais_vendidos[0]?.nome || "—";

  document.getElementById("hero-faturamento-total").textContent = `R$ ${formatarMoeda(faturamentoTotal)}`;
  document.getElementById("ultima-geracao").textContent =
    "Última análise: " + new Date(analise.gerado_em).toLocaleString("pt-BR");
  document.getElementById("chip-ticket-medio").textContent = `R$ ${formatarMoeda(dados.ticket_medio)}`;
  document.getElementById("chip-pedidos-30d").textContent = dados.quantidade_pedidos_ultimos_30_dias;
  document.getElementById("chip-produto-top").textContent = produtoTop;

  // Interpretação da IA, com fallback elegante caso o texto venha com erro de parsing.
  const interpretacao = analise.kpis.interpretacao || "";
  const textoEl = document.getElementById("texto-interpretacao");
  if (!interpretacao || interpretacao.toLowerCase().includes("não foi possível")) {
    textoEl.textContent = "A interpretação em texto não pôde ser gerada desta vez, mas os KPIs, anomalias e recomendações abaixo continuam completos e atualizados.";
    textoEl.classList.add("vazio");
  } else {
    textoEl.textContent = interpretacao;
    textoEl.classList.remove("vazio");
  }

  const labelsCanal = Object.keys(dados.faturamento_por_canal).map((c) => ROTULO_CANAL[c] || c);
  const contextoFaturamento = document.getElementById("grafico-faturamento").getContext("2d");
  if (graficoFaturamento) graficoFaturamento.destroy();
  graficoFaturamento = new Chart(contextoFaturamento, {
    type: "bar",
    data: {
      labels: labelsCanal,
      datasets: [{
        label: "Faturamento por canal",
        data: Object.values(dados.faturamento_por_canal),
        backgroundColor: (contexto) => {
          const { ctx, chartArea } = contexto.chart;
          if (!chartArea) return "#9C2B4E";
          return criarGradiente(ctx, chartArea, "#9C2B4E", "#5C1631");
        },
        borderRadius: 6,
        maxBarThickness: 90,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#2B1420",
          padding: 10,
          cornerRadius: 8,
          callbacks: { label: (item) => `R$ ${formatarMoeda(item.parsed.y)}` },
        },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: "#EDEAEA" }, ticks: { callback: (v) => `R$ ${v}` } },
        x: { grid: { display: false } },
      },
    },
  });

  const contextoTop = document.getElementById("grafico-top-produtos").getContext("2d");
  if (graficoTopProdutos) graficoTopProdutos.destroy();
  graficoTopProdutos = new Chart(contextoTop, {
    type: "bar",
    data: {
      labels: dados.top_produtos_mais_vendidos.map((p) => p.nome),
      datasets: [{
        label: "Quantidade vendida",
        data: dados.top_produtos_mais_vendidos.map((p) => p.quantidade_vendida),
        backgroundColor: (contexto) => {
          const { ctx, chartArea } = contexto.chart;
          if (!chartArea) return "#7A1F3D";
          return criarGradiente(ctx, chartArea, "#B23A6E", "#7A1F3D");
        },
        borderRadius: 6,
        maxBarThickness: 26,
      }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#2B1420",
          padding: 10,
          cornerRadius: 8,
          callbacks: { label: (item) => `${item.parsed.x} unidades` },
        },
      },
      scales: {
        x: { beginAtZero: true, grid: { color: "#EDEAEA" } },
        y: { grid: { display: false } },
      },
    },
  });

  const anomalias = analise.anomalias.alertas || [];
  renderizarResumoSeveridade("resumo-anomalias", anomalias, "severidade");
  renderizarCards("lista-anomalias", anomalias, "severidade");

  const recomendacoes = analise.recomendacoes.acoes || [];
  renderizarResumoSeveridade("resumo-recomendacoes", recomendacoes, "prioridade");
  renderizarCards("lista-recomendacoes", recomendacoes, "prioridade");
}

async function iniciarAnalise() {
  mostrarCarregando();
  try {
    const analise = await chamarApi("/ia/analisar", { method: "POST" });
    renderizarAnalise(analise);
    exibirToast("Análise gerada com sucesso!");
  } catch (erro) {
    mostrarEstadoVazio();
    await exibirMensagem(erro.message, "Erro na análise");
  }
}

document.getElementById("botao-analisar").addEventListener("click", iniciarAnalise);
document.getElementById("botao-reanalisar").addEventListener("click", iniciarAnalise);

(async function iniciar() {
  const ultima = await chamarApi("/ia/ultima");
  if (ultima) {
    renderizarAnalise(ultima);
  } else {
    mostrarEstadoVazio();
  }
})();
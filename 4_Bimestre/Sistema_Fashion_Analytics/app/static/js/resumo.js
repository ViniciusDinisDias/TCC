const CANAL_ROTULOS = { loja_fisica: "Loja física", shopee: "Shopee" };
const STATUS_ROTULOS = {
  pendente: "Pendente", confirmado: "Confirmado", enviado: "Enviado",
  entregue: "Entregue", cancelado: "Cancelado", vendido: "Vendido",
};

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeDelta(variacaoPct) {
  if (variacaoPct === null || variacaoPct === undefined) return "";
  const sentido = variacaoPct >= 0 ? "up" : "down";
  const seta = variacaoPct >= 0 ? "▲" : "▼";
  return `<span class="delta ${sentido}">${seta} ${Math.abs(variacaoPct).toFixed(1)}% vs. mês anterior</span>`;
}

function renderizarKpis(kpis) {
  document.getElementById("kpis-resumo").innerHTML = `
    <div class="kpi kpi-faturamento">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Faturamento do mês</div>
        <div class="kpi-icone"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
      </div>
      <div class="kpi-valor">R$ ${formatarMoeda(kpis.faturamento_mes_atual)}</div>
      ${badgeDelta(kpis.variacao_faturamento_pct)}
    </div>
    <div class="kpi kpi-pedidos">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Pedidos</div>
        <div class="kpi-icone"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg></div>
      </div>
      <div class="kpi-valor">${kpis.pedidos_mes_atual}</div>
      ${badgeDelta(kpis.variacao_pedidos_pct)}
    </div>
    <div class="kpi kpi-ticket">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Ticket médio</div>
        <div class="kpi-icone"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M12 3v18"/></svg></div>
      </div>
      <div class="kpi-valor">R$ ${formatarMoeda(kpis.ticket_medio_mes_atual)}</div>
      ${badgeDelta(kpis.variacao_ticket_medio_pct)}
    </div>
    <div class="kpi kpi-estoque">
      <div class="kpi-cabecalho">
        <div class="kpi-label">Valor em estoque</div>
        <div class="kpi-icone"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg></div>
      </div>
      <div class="kpi-valor">R$ ${formatarMoeda(kpis.valor_total_estoque)}</div>
    </div>
  `;
}

let graficoVendasMensais = null;

function renderizarGraficoVendas(vendasPorMes) {
  const contexto = document.getElementById("grafico-vendas-mensais").getContext("2d");
  const gradiente = contexto.createLinearGradient(0, 0, 0, 260);
  gradiente.addColorStop(0, "#9C2B4E");
  gradiente.addColorStop(1, "#C24C70");

  if (graficoVendasMensais) graficoVendasMensais.destroy();
  graficoVendasMensais = new Chart(contexto, {
    type: "bar",
    data: {
      labels: vendasPorMes.map((item) => item.mes),
      datasets: [{
        label: "Faturamento (R$)",
        data: vendasPorMes.map((item) => item.valor),
        backgroundColor: gradiente,
        borderRadius: 6,
        maxBarThickness: 56,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#E7E5E4" } },
      },
      maintainAspectRatio: false,
    },
  });
}

function iconeAlertaCritico() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`;
}

function iconeAlertaParado() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`;
}

function renderizarAlertas(alertas) {
  const container = document.getElementById("lista-alertas-estoque");
  if (!alertas.length) {
    container.innerHTML = "<p>Nenhum alerta de estoque no momento.</p>";
    return;
  }
  container.innerHTML = alertas
    .map((alerta) => {
      const critico = alerta.tipo === "baixo";
      const selo = critico ? "critical" : "warning";
      const rotulo = critico ? "Crítico" : "Parado";
      const icone = critico ? iconeAlertaCritico() : iconeAlertaParado();
      const detalhe = critico
        ? `${alerta.quantidade_estoque} un. em estoque · mínimo de ${alerta.estoque_minimo}`
        : "Sem vendas recentes · produto parado";
      return `
        <div class="alerta">
          <div class="selo ${selo}" style="color:var(--${critico ? "critical" : "warning"})">${icone}</div>
          <div class="alerta-corpo">
            <div class="alerta-titulo">${escaparHtml(alerta.nome)} (${escaparHtml(alerta.sku)})</div>
            <div class="alerta-detalhe">${detalhe}</div>
          </div>
          <span class="tag-severidade ${selo}">${rotulo}</span>
        </div>
      `;
    })
    .join("");
}

function renderizarUltimosPedidos(pedidos) {
  const corpo = document.getElementById("tabela-ultimos-pedidos");
  corpo.innerHTML = pedidos
    .map((pedido) => `
      <tr>
        <td>${escaparHtml(pedido.cliente_nome)}</td>
        <td><span class="canal-pill">${escaparHtml(CANAL_ROTULOS[pedido.canal] || pedido.canal)}</span></td>
        <td>${new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}</td>
        <td><span class="status-pill ${pedido.status}">${escaparHtml(STATUS_ROTULOS[pedido.status] || pedido.status)}</span></td>
        <td>R$ ${formatarMoeda(pedido.valor_total)}</td>
      </tr>
    `)
    .join("");
}

function renderizarPeriodoAtual() {
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const agora = new Date();
  document.getElementById("periodo-texto").textContent = `${meses[agora.getMonth()]} de ${agora.getFullYear()}`;
}

function renderizarTotalPeriodo(vendasPorMes) {
  const total = vendasPorMes.reduce((soma, item) => soma + item.valor, 0);
  document.getElementById("total-periodo").textContent = `Total: R$ ${formatarMoeda(total)}`;
}

(async function iniciar() {
  const resumo = await chamarApi("/dashboard/resumo");
  renderizarKpis(resumo.kpis);
  renderizarGraficoVendas(resumo.vendas_por_mes);
  renderizarTotalPeriodo(resumo.vendas_por_mes);
  renderizarAlertas(resumo.alertas_estoque);
  renderizarUltimosPedidos(resumo.ultimos_pedidos);
  renderizarPeriodoAtual();
})();
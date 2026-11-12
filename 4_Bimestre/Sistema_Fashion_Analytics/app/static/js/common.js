async function chamarApi(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (resposta.status === 401) {
    window.location.href = "/login";
    return new Promise(() => {});
  }
  if (resposta.status === 204) {
    return null;
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    let mensagem = "Erro ao comunicar com o servidor";
    if (dados && dados.detail) {
      mensagem = Array.isArray(dados.detail)
        ? dados.detail.map((erro) => erro.msg).join("; ")
        : dados.detail;
    }
    throw new Error(mensagem);
  }
  return dados;
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : String(texto);
  return div.innerHTML;
}

/** Modal de confirmação (substitui window.confirm). Retorna uma Promise
 * que resolve true (Sim) ou false (Cancelar / clique fora do modal). */
function confirmarAcao(mensagem) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirmacao-overlay";
    overlay.innerHTML = `
      <div class="modal confirmacao-modal">
        <p class="confirmacao-mensagem">${escaparHtml(mensagem)}</p>
        <div class="confirmacao-acoes">
          <button type="button" class="btn-secundario" data-resposta="nao">Cancelar</button>
          <button type="button" class="btn-perigo" data-resposta="sim">Sim</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function concluir(resultado) {
      overlay.remove();
      resolve(resultado);
    }

    overlay.addEventListener("click", (evento) => {
      if (evento.target === overlay) {
        concluir(false);
        return;
      }
      const resposta = evento.target.dataset.resposta;
      if (resposta === "sim") concluir(true);
      if (resposta === "nao") concluir(false);
    });
  });
}

/** Modal de mensagem simples (substitui window.alert). Retorna uma Promise
 * que resolve quando o usuário fecha (clique em OK ou fora do modal). */
function exibirMensagem(mensagem, titulo = "Aviso") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirmacao-overlay";
    overlay.innerHTML = `
      <div class="modal confirmacao-modal">
        <h2 class="confirmacao-titulo">${escaparHtml(titulo)}</h2>
        <p class="confirmacao-mensagem">${escaparHtml(mensagem)}</p>
        <div class="confirmacao-acoes">
          <button type="button" class="btn" data-resposta="ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function concluir() {
      overlay.remove();
      resolve();
    }

    overlay.addEventListener("click", (evento) => {
      if (evento.target === overlay) {
        concluir();
        return;
      }
      if (evento.target.dataset.resposta === "ok") concluir();
    });
  });
}

function garantirToastContainer() {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

const TOAST_ICONES = {
  sucesso: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>`,
  erro: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
  aviso: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>`,
};

/** Mostra uma notificação temporária no canto superior direito.
 * tipo: "sucesso" (padrão), "erro" ou "aviso". */
function exibirToast(mensagem, tipo = "sucesso") {
  const container = garantirToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast ${tipo === "sucesso" ? "" : tipo}`;
  toast.innerHTML = `
    <span class="toast-icone">${TOAST_ICONES[tipo] || TOAST_ICONES.sucesso}</span>
    <span class="toast-texto">${escaparHtml(mensagem)}</span>
    <button type="button" class="toast-fechar" aria-label="Fechar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  `;
  container.appendChild(toast);

  function remover() {
    toast.classList.add("saindo");
    setTimeout(() => toast.remove(), 200);
  }
  toast.querySelector(".toast-fechar").addEventListener("click", remover);
  setTimeout(remover, 3500);
}
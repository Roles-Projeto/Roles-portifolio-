// Troca "Olá, Nome" + botão Sair por uma bolinha de perfil com menu.
// Roda depois do menu.js e reaproveita o botão Sair que ele criou.
const menu = document.getElementById("menu");

const ICONE_SETA = `<svg class="perfil-seta" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
const ICONE_MAIS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const ICONE_SAIR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`;

function montar() {
  const ola = menu.querySelector(".ola");
  const sair = [...menu.querySelectorAll("button")].find(
    (b) => b.textContent.trim().toLowerCase() === "sair"
  );
  if (!ola || !sair) return;

  const nome = ola.textContent.replace(/^\s*Ol[aá],?\s*/i, "").trim() || "Conta";

  const caixa = document.createElement("div");
  caixa.className = "perfil";
  caixa.innerHTML = `
    <button type="button" class="perfil-botao" aria-haspopup="true" aria-expanded="false" aria-label="Menu da conta">
      <span class="avatar"></span>${ICONE_SETA}
    </button>
    <div class="perfil-menu" hidden>
      <div class="perfil-cab"><strong></strong><span>Sua conta</span></div>
      <a class="perfil-item" href="criar-evento.html">${ICONE_MAIS}Criar evento</a>
      <div class="perfil-sep"></div>
      <button type="button" class="perfil-item sair">${ICONE_SAIR}Sair</button>
    </div>`;

  caixa.querySelector(".avatar").textContent = nome.charAt(0).toUpperCase();
  caixa.querySelector("strong").textContent = nome;

  const botao = caixa.querySelector(".perfil-botao");
  const painel = caixa.querySelector(".perfil-menu");

  function fechar() {
    painel.hidden = true;
    botao.setAttribute("aria-expanded", "false");
  }

  botao.addEventListener("click", () => {
    const abrir = painel.hidden;
    painel.hidden = !abrir;
    botao.setAttribute("aria-expanded", String(abrir));
  });

  // O botão Sair de verdade continua sendo o do menu.js; este só o aciona.
  caixa.querySelector(".sair").addEventListener("click", () => sair.click());

  document.addEventListener("click", (e) => {
    if (!caixa.contains(e.target)) fechar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fechar();
  });

  sair.style.display = "none";
  ola.remove();
  menu.append(caixa);
}

if (menu) {
  // O menu.js pode montar o header depois que a página carrega.
  new MutationObserver(montar).observe(menu, { childList: true });
  montar();
}
import { estaLogada, lerUsuario, sair } from "./auth.js";
import { escapar } from "./util.js";

const nav = document.getElementById("menu");

const ICONE_SETA = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
const ICONE_MAIS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const ICONE_LOCAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
const ICONE_USUARIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`;
const ICONE_SAIR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`;

function primeiroNome(nome) {
  return String(nome ?? "").trim().split(/\s+/)[0];
}

function renderizarMenu() {
  const pagina = window.location.pathname.split("/").pop();
  const emLugares = ["lugares.html", "lugar.html", "criar-lugar.html"].includes(pagina);
  // Na página de conta nenhum dos dois links do topo fica marcado.
  const emConta = pagina === "conta.html";
  const eventos = `
    <a class="nav-texto${emLugares || emConta ? "" : " ativo"}" href="index.html">Eventos</a>
    <a class="nav-texto${emLugares ? " ativo" : ""}" href="lugares.html">Lugares</a>`;

  if (!estaLogada()) {
    nav.innerHTML = `
      ${eventos}
      <a class="nav-link" href="login.html">Entrar</a>
      <a class="nav-link destaque" href="cadastro.html">Criar conta</a>`;
    return;
  }

  const usuario = lerUsuario();
  const nome = primeiroNome(usuario?.nome) || "Conta";

  nav.innerHTML = `
    ${eventos}
    <a class="nav-link so-desktop" href="criar-evento.html">Criar evento</a>
    <div class="perfil">
      <button type="button" class="perfil-botao" id="perfil-botao" aria-haspopup="true" aria-expanded="false" aria-label="Menu da conta">
        <span class="avatar">${escapar(nome.charAt(0).toUpperCase())}</span>${ICONE_SETA}
      </button>
      <div class="perfil-menu" id="perfil-menu" hidden>
        <div class="perfil-cab"><strong>${escapar(nome)}</strong><span>Sua conta</span></div>
        <a class="perfil-item" href="conta.html">${ICONE_USUARIO}Minha conta</a>
        <a class="perfil-item" href="criar-evento.html">${ICONE_MAIS}Criar evento</a>
        <a class="perfil-item" href="criar-lugar.html">${ICONE_MAIS}Cadastrar lugar</a>
        <a class="perfil-item" href="conta.html#lugares">${ICONE_LOCAL}Meus lugares</a>
        <div class="perfil-sep"></div>
        <button type="button" class="perfil-item sair" id="botao-sair">${ICONE_SAIR}Sair</button>
      </div>
    </div>`;

  const botao = document.getElementById("perfil-botao");
  const painel = document.getElementById("perfil-menu");

  function fechar() {
    painel.hidden = true;
    botao.setAttribute("aria-expanded", "false");
  }

  botao.addEventListener("click", () => {
    const abrir = painel.hidden;
    painel.hidden = !abrir;
    botao.setAttribute("aria-expanded", String(abrir));
  });

  document.addEventListener("click", (e) => {
    if (!botao.parentElement.contains(e.target)) fechar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fechar();
  });

  document.getElementById("botao-sair").addEventListener("click", sair);
}

// O rodapé é montado aqui para aparecer igual em todas as páginas.
function renderizarRodape() {
  if (document.querySelector(".rodape")) return;

  const logada = estaLogada();
  const ano = new Date().getFullYear();

  const conta = logada
    ? `<button class="rodape-sair" id="rodape-sair" type="button">Sair</button>`
    : `<a href="login.html">Entrar</a>
       <a href="cadastro.html">Criar conta</a>`;

  const rodape = document.createElement("footer");
  rodape.className = "rodape";
  rodape.innerHTML = `
    <div class="rodape-conteudo">
      <div class="rodape-marca">
        <a class="logo" href="index.html">Rolês<span class="ponto">.</span></a>
        <p>Descubra o que fazer em Goiânia e região.</p>
      </div>

      <nav class="rodape-links" aria-label="Navegação">
        <h4>Navegar</h4>
        <a href="index.html">Eventos</a>
                <a href="lugares.html">Lugares</a>
        <a href="criar-evento.html">Criar evento</a>
      </nav>

      <nav class="rodape-links" aria-label="Conta">
        <h4>Conta</h4>
        ${conta}
      </nav>

      <div class="rodape-sobre">
        <h4>Sobre</h4>
        <p>Projeto de portfólio feito com C# (.NET), PostgreSQL e JavaScript.</p>
        <a href="https://github.com/Roles-Projeto/Roles-portifolio-" target="_blank" rel="noopener">Código no GitHub</a>
      </div>
    </div>

    <p class="rodape-direitos">© ${ano} Rolês. Projeto de portfólio.</p>`;

  document.body.appendChild(rodape);

  const botaoSair = document.getElementById("rodape-sair");
  if (botaoSair) botaoSair.addEventListener("click", sair);
}

if (nav) renderizarMenu();
renderizarRodape();
import { estaLogada, lerUsuario, sair } from "./auth.js";
import { escapar } from "./util.js";

const nav = document.getElementById("menu");

function primeiroNome(nome) {
  return String(nome ?? "").trim().split(/\s+/)[0];
}

function renderizar() {
  if (estaLogada()) {
    const usuario = lerUsuario();

    nav.innerHTML = `
      <span class="ola">Olá, ${escapar(primeiroNome(usuario?.nome))}</span>
      <a class="nav-link" href="criar-evento.html">Criar evento</a>
      <button class="nav-link" id="botao-sair" type="button">Sair</button>`;

    document.getElementById("botao-sair").addEventListener("click", sair);
  } else {
    nav.innerHTML = `
      <a class="nav-link" href="login.html">Entrar</a>
      <a class="nav-link destaque" href="cadastro.html">Criar conta</a>`;
  }
}

if (nav) renderizar();
import { registrar, login } from "./api.js";
import { salvarSessao, estaLogada, destinoDepoisDoLogin } from "./auth.js";
import { escapar, mensagemDoErro } from "./util.js";

const form = document.getElementById("form-cadastro");
const elErros = document.getElementById("erros");
const botao = document.getElementById("botao-cadastrar");

if (estaLogada()) {
  window.location.replace(destinoDepoisDoLogin());
}

function mostrarErros(mensagens) {
  elErros.innerHTML = `<ul>${mensagens.map((m) => `<li>${escapar(m)}</li>`).join("")}</ul>`;
  elErros.hidden = false;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  elErros.hidden = true;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const campos = new FormData(form);
  const nome = String(campos.get("nome")).trim();
  const email = String(campos.get("email")).trim();
  const senha = String(campos.get("senha"));
  const confirmar = String(campos.get("confirmar"));

  // Conferir as duas senhas é só uma ajuda para quem digita; a API valida o resto.
  if (senha !== confirmar) {
    mostrarErros(["As senhas não coincidem."]);
    return;
  }

  botao.disabled = true;
  botao.textContent = "Criando conta...";

  try {
    await registrar({ nome, email, senha });

    // Já entra logada, sem pedir e-mail e senha de novo.
    const sessao = await login({ email, senha });
    salvarSessao(sessao);

    window.location.href = destinoDepoisDoLogin();
  } catch (erro) {
    console.error(erro);
    mostrarErros(mensagemDoErro(erro));
    botao.disabled = false;
    botao.textContent = "Criar conta";
  }
});
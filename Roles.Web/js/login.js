import { login } from "./api.js";
import { salvarSessao, estaLogada, destinoDepoisDoLogin } from "./auth.js";
import { escapar, mensagemDoErro } from "./util.js";

const form = document.getElementById("form-login");
const elErros = document.getElementById("erros");
const botao = document.getElementById("botao-entrar");

// Quem já está logada não precisa ver esta tela.
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

  botao.disabled = true;
  botao.textContent = "Entrando...";

  try {
    const sessao = await login({
      email: String(campos.get("email")).trim(),
      senha: String(campos.get("senha")),
    });

    salvarSessao(sessao);
    window.location.href = destinoDepoisDoLogin();
  } catch (erro) {
    console.error(erro);
    mostrarErros(mensagemDoErro(erro));
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});
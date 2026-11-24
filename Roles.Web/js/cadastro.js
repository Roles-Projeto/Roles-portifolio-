import { registrar, login } from "./api.js";
import { salvarSessao, estaLogada, destinoDepoisDoLogin } from "./auth.js";
import { escapar, mensagemDoErro } from "./util.js";

const form = document.getElementById("form-cadastro");
const elErros = document.getElementById("erros");
const botao = document.getElementById("botao-cadastrar");
const campoSenha = document.getElementById("senha");
const campoConfirmar = document.getElementById("confirmar");
const botaoMostrar = document.getElementById("mostrar-senha");
const botaoGoogle = document.getElementById("botao-google");
const barras = [1, 2, 3].map((n) => document.getElementById(`forca-${n}`));
const elForcaTexto = document.getElementById("forca-texto");

if (estaLogada()) {
  window.location.replace(destinoDepoisDoLogin());
}

function mostrarErros(mensagens) {
  elErros.innerHTML = `<ul>${mensagens.map((m) => `<li>${escapar(m)}</li>`).join("")}</ul>`;
  elErros.hidden = false;
}

// Indicador de força: é só uma ajuda visual, a regra de verdade continua na API.
// 0 = vazio, 1 = curta, 2 = razoável, 3 = forte.
function nivelDaSenha(senha) {
  if (senha.length === 0) return 0;
  if (senha.length < 8) return 1;

  const mistura = /[a-zA-Z]/.test(senha) && /\d/.test(senha);
  const extra = senha.length >= 12 || /[^a-zA-Z0-9]/.test(senha);
  return mistura && extra ? 3 : 2;
}

const TEXTOS_FORCA = ["Mínimo de 8 caracteres", "Mínimo de 8 caracteres", "Senha razoável", "Senha forte"];

campoSenha.addEventListener("input", () => {
  const nivel = nivelDaSenha(campoSenha.value);
  barras.forEach((barra, i) => barra.classList.toggle("on", i < nivel));
  elForcaTexto.textContent = TEXTOS_FORCA[nivel];
});

// O botão "Mostrar" / "Ocultar" mexe nos dois campos de senha ao mesmo tempo.
botaoMostrar.addEventListener("click", () => {
  const estavaVisivel = campoSenha.type === "text";
  const novoTipo = estavaVisivel ? "password" : "text";
  campoSenha.type = novoTipo;
  campoConfirmar.type = novoTipo;
  botaoMostrar.textContent = estavaVisivel ? "Mostrar" : "Ocultar";
  botaoMostrar.setAttribute("aria-label", estavaVisivel ? "Mostrar senhas" : "Ocultar senhas");
});

// O cadastro com o Google ainda não está ligado: por enquanto só avisa.
botaoGoogle.addEventListener("click", () => {
  mostrarErros(["O cadastro com o Google ainda não está disponível. Use seu e-mail e uma senha."]);
});

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
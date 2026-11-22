import { criarEvento, criarIngresso } from "./api.js";
import { estaLogada } from "./auth.js";
import { escapar, mensagemDoErro } from "./util.js";

// Só quem está logada cria eventos. Se não estiver, vai para o login e volta para cá depois.
if (!estaLogada()) {
  window.location.replace("login.html?voltar=criar-evento.html");
}

const form = document.getElementById("form-evento");
const elErros = document.getElementById("erros");
const elAviso = document.getElementById("aviso");
const botao = document.getElementById("botao-salvar");
const elIngressos = document.getElementById("lista-ingressos");
const modelo = document.getElementById("modelo-ingresso");
const botaoAdicionar = document.getElementById("adicionar-ingresso");

// Texto em branco vira null (a API entende como "não informado").
function textoOuNulo(valor) {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

// O campo datetime-local entrega "2027-01-15T19:00"; a API espera os segundos.
function dataParaApi(valor) {
  return valor ? `${valor}:00` : null;
}

function lerEvento() {
  const campos = new FormData(form);

  return {
    nome: String(campos.get("nome")).trim(),
    assunto: textoOuNulo(campos.get("assunto")),
    categoria: textoOuNulo(campos.get("categoria")),
    imagem: textoOuNulo(campos.get("imagem")),
    dataInicio: dataParaApi(campos.get("dataInicio")),
    dataFim: dataParaApi(campos.get("dataFim")),
    descricao: textoOuNulo(campos.get("descricao")),
    localNome: textoOuNulo(campos.get("localNome")),
    cep: textoOuNulo(campos.get("cep")),
    rua: textoOuNulo(campos.get("rua")),
    cidade: textoOuNulo(campos.get("cidade")),
    estado: textoOuNulo(campos.get("estado")),
    nomeProdutor: textoOuNulo(campos.get("nomeProdutor")),
  };
}

// Os campos das linhas de ingresso não têm "name", então o FormData acima os ignora.
// Eles são lidos aqui, linha por linha.
function lerIngressos() {
  return [...elIngressos.querySelectorAll(".ingresso-linha")].map((linha) => ({
    titulo: linha.querySelector(".ing-titulo").value.trim(),
    tipo: linha.querySelector(".ing-tipo").value,
    valor: Number(linha.querySelector(".ing-valor").value || 0),
    quantidadeTotal: Number(linha.querySelector(".ing-quantidade").value),
  }));
}

// Ingresso gratuito trava o valor em 0.
function atualizarTipo(linha) {
  const gratuito = linha.querySelector(".ing-tipo").value === "gratuito";
  const campoValor = linha.querySelector(".ing-valor");

  campoValor.disabled = gratuito;
  if (gratuito) campoValor.value = "0";
  else if (campoValor.value === "0") campoValor.value = "";
}

function adicionarLinhaIngresso() {
  elIngressos.appendChild(modelo.content.cloneNode(true));
}

function mostrarErros(mensagens) {
  elAviso.hidden = true;
  elErros.innerHTML = `<ul>${mensagens.map((m) => `<li>${escapar(m)}</li>`).join("")}</ul>`;
  elErros.hidden = false;
  elErros.scrollIntoView({ behavior: "smooth", block: "center" });
}

function esconderMensagens() {
  elErros.hidden = true;
  elErros.innerHTML = "";
  elAviso.hidden = true;
  elAviso.innerHTML = "";
}

// Evento criado, mas algum ingresso falhou: explica o que houve e leva ao evento.
function mostrarAvisoParcial(eventoId, falhas) {
  elAviso.innerHTML = `
    <p><strong>O evento foi criado, mas ${falhas.length} ingresso(s) não puderam ser salvos:</strong></p>
    <ul>${falhas.map((f) => `<li>${escapar(f)}</li>`).join("")}</ul>
    <p><a href="evento.html?id=${Number(eventoId)}">Abrir o evento criado →</a></p>`;
  elAviso.hidden = false;
  elAviso.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Eventos da seção de ingressos
botaoAdicionar.addEventListener("click", adicionarLinhaIngresso);

elIngressos.addEventListener("click", (evento) => {
  const remover = evento.target.closest(".remover");
  if (remover) remover.closest(".ingresso-linha").remove();
});

elIngressos.addEventListener("change", (evento) => {
  if (evento.target.matches(".ing-tipo")) {
    atualizarTipo(evento.target.closest(".ingresso-linha"));
  }
});

form.addEventListener("submit", async (evento) => {
  // Impede o navegador de recarregar a página.
  evento.preventDefault();
  esconderMensagens();

  // Validação do HTML (required, minlength, pattern...) antes de chamar a API.
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const dados = lerEvento();
  const ingressos = lerIngressos();

  if (dados.dataFim && dados.dataFim < dados.dataInicio) {
    mostrarErros(["A data de término não pode ser anterior à data de início."]);
    return;
  }

  const semValor = ingressos.find((i) => i.tipo === "pago" && i.valor <= 0);
  if (semValor) {
    mostrarErros([`O ingresso "${semValor.titulo}" é pago e precisa ter valor maior que 0.`]);
    return;
  }

  botao.disabled = true;
  botao.textContent = "Publicando...";

  // Passo 1: cria o evento.
  let criado;
  try {
    criado = await criarEvento(dados);
  } catch (erro) {
    console.error(erro);
    mostrarErros(mensagemDoErro(erro));
    botao.disabled = false;
    botao.textContent = "Publicar evento";
    return;
  }

  // Passo 2: cria os ingressos, um por vez, com o id do evento recém-criado.
  const falhas = [];
  for (const ingresso of ingressos) {
    try {
      await criarIngresso(criado.id, ingresso);
    } catch (erro) {
      console.error(erro);
      falhas.push(`${ingresso.titulo}: ${mensagemDoErro(erro)[0]}`);
    }
  }

  if (falhas.length === 0) {
    window.location.href = `evento.html?id=${criado.id}`;
    return;
  }

  // O evento já existe: esconde o botão para não criar o mesmo evento duas vezes.
  botao.hidden = true;
  mostrarAvisoParcial(criado.id, falhas);
});

// Começa com uma linha de ingresso pronta (dá para remover).
adicionarLinhaIngresso();
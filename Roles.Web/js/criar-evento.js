import { buscarEvento, criarEvento, atualizarEvento, criarIngresso } from "./api.js";
import { estaLogada, lerUsuario } from "./auth.js";
import { escapar, mensagemDoErro } from "./util.js";

// criar-evento.html        -> criar
// criar-evento.html?id=3   -> editar o evento 3
const parametros = new URLSearchParams(window.location.search);
const editando = parametros.has("id");
const eventoId = Number(parametros.get("id"));

// Só quem está logada cria ou edita. Se não estiver, vai para o login.
if (!estaLogada()) {
  window.location.replace(editando ? "login.html" : "login.html?voltar=criar-evento.html");
}

const form = document.getElementById("form-evento");
const elTitulo = document.querySelector("h1.titulo");
const elErros = document.getElementById("erros");
const elAviso = document.getElementById("aviso");
const botao = document.getElementById("botao-salvar");
const elIngressos = document.getElementById("lista-ingressos");
const blocoIngressos = elIngressos.closest("fieldset");
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

// A API devolve "2027-01-15T19:00:00"; o campo datetime-local quer "2027-01-15T19:00".
function dataParaCampo(iso) {
  return iso ? iso.slice(0, 16) : "";
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

// Preenche o formulário com os dados do evento (modo edição).
function preencherFormulario(e) {
  const valores = {
    nome: e.nome,
    assunto: e.assunto,
    categoria: e.categoria,
    imagem: e.imagem,
    dataInicio: dataParaCampo(e.dataInicio),
    dataFim: dataParaCampo(e.dataFim),
    descricao: e.descricao,
    localNome: e.localNome,
    cep: e.cep,
    rua: e.rua,
    cidade: e.cidade,
    estado: e.estado,
    nomeProdutor: e.nomeProdutor,
  };

  for (const [nome, valor] of Object.entries(valores)) {
    const campo = form.elements[nome];
    if (campo) campo.value = valor ?? "";
  }
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
function mostrarAvisoParcial(eventoIdCriado, falhas) {
  elAviso.innerHTML = `
    <p><strong>O evento foi criado, mas ${falhas.length} ingresso(s) não puderam ser salvos:</strong></p>
    <ul>${falhas.map((f) => `<li>${escapar(f)}</li>`).join("")}</ul>
    <p><a href="evento.html?id=${Number(eventoIdCriado)}">Abrir o evento criado →</a></p>`;
  elAviso.hidden = false;
  elAviso.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Modo edição: busca o evento, confere se a pessoa é a dona e preenche o formulário.
async function iniciarEdicao() {
  elTitulo.textContent = "Editar evento";
  botao.textContent = "Salvar alterações";
  blocoIngressos.hidden = true; // nesta versão a edição não mexe nos ingressos
  form.hidden = true;

  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    elTitulo.textContent = "Evento não encontrado.";
    return;
  }

  try {
    const evento = await buscarEvento(eventoId);

    if (evento.usuarioId !== lerUsuario()?.id) {
      elTitulo.textContent = "Você não pode editar este evento.";
      return;
    }

    preencherFormulario(evento);
    form.hidden = false;
  } catch (erro) {
    console.error(erro);
    elTitulo.textContent =
      erro.status === 404 ? "Evento não encontrado." : "Não foi possível carregar o evento.";
  }
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

  if (dados.dataFim && dados.dataFim < dados.dataInicio) {
    mostrarErros(["A data de término não pode ser anterior à data de início."]);
    return;
  }

  // Modo edição: um único PUT com os dados do evento.
  if (editando) {
    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
      await atualizarEvento(eventoId, dados);
      window.location.href = `evento.html?id=${eventoId}`;
    } catch (erro) {
      console.error(erro);
      mostrarErros(mensagemDoErro(erro));
      botao.disabled = false;
      botao.textContent = "Salvar alterações";
    }
    return;
  }

  // Modo criação.
  const ingressos = lerIngressos();

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

// Só prepara a tela se a pessoa está logada (senão o redirecionamento acima já foi pedido).
if (estaLogada()) {
  if (editando) {
    iniciarEdicao();
  } else {
    // Começa com uma linha de ingresso pronta (dá para remover).
    adicionarLinhaIngresso();
  }
}
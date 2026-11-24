import {
  buscarEvento,
  criarEvento,
  atualizarEvento,
  criarIngresso,
  listarIngressos,
  atualizarIngresso,
  apagarIngresso,
  listarLugares,
} from "./api.js";
import { estaLogada, lerUsuario } from "./auth.js";
import { escapar, mensagemDoErro, formatarDataCompleta } from "./util.js";
import { enviarImagem, validarImagem } from "./upload.js";

const MSG_IMAGEM = "JPG, PNG ou WebP, até 5 MB.";

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
const elTitulo = document.getElementById("cad-titulo");
const elSub = document.getElementById("cad-sub");
const elSeletor = document.getElementById("cad-tipo");
const elErros = document.getElementById("erros");
const elAviso = document.getElementById("aviso");
const botao = document.getElementById("botao-salvar");
const elIngressos = document.getElementById("lista-ingressos");
const modelo = document.getElementById("modelo-ingresso");
const botaoAdicionar = document.getElementById("adicionar-ingresso");

const elLugar = document.getElementById("lugar-id");
const elLugarDica = document.getElementById("lugar-dica");

const campoImagem = document.getElementById("imagem");
const arquivoImagem = document.getElementById("arquivo-imagem");
const areaUpload = document.getElementById("upload-area");
const botaoEscolher = document.getElementById("upload-escolher");
const botaoRemover = document.getElementById("upload-remover");
const msgImagem = document.getElementById("upload-msg");

const pvCapa = document.getElementById("pv-capa");
const pvTipo = document.getElementById("pv-tipo");
const pvNome = document.getElementById("pv-nome");
const pvData = document.getElementById("pv-data");
const pvLocal = document.getElementById("pv-local");
const pvPreco = document.getElementById("pv-preco");

let lugares = [];

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
  const lugar = campos.get("lugarId");

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
    // Importante: a API troca o lugar a cada PUT, então ele sempre vai junto.
    lugarId: lugar ? Number(lugar) : null,
  };
}

// Lugares cadastrados: alimenta o select do local.
async function carregarLugares() {
  try {
    lugares = await listarLugares();
  } catch (erro) {
    console.error(erro);
    elLugarDica.textContent = "Não foi possível carregar os lugares. Você ainda pode informar o local abaixo.";
    return;
  }

  const opcoes = lugares
    .map((l) => {
      const detalhe = [l.cidade, l.estado].filter(Boolean).join("/");
      const texto = detalhe ? `${l.nome} · ${detalhe}` : l.nome;
      return `<option value="${Number(l.id)}">${escapar(texto)}</option>`;
    })
    .join("");

  elLugar.insertAdjacentHTML("beforeend", opcoes);
}

// Escolheu um lugar: copia o endereço dele para os campos do local.
function aplicarLugar() {
  const lugar = lugares.find((l) => String(l.id) === elLugar.value);
  if (!lugar) return;

  const valores = {
    localNome: lugar.nome,
    cep: lugar.cep,
    rua: lugar.rua,
    cidade: lugar.cidade,
    estado: lugar.estado,
  };

  for (const [nome, valor] of Object.entries(valores)) {
    const campo = form.elements[nome];
    if (campo) campo.value = valor ?? "";
  }
}

// Prévia ao vivo: monta o card com o que já foi digitado.
function atualizarPrevia() {
  const e = lerEvento();

  pvCapa.innerHTML = e.imagem
    ? `<img src="${escapar(e.imagem)}" alt="">`
    : escapar((e.nome.charAt(0) || "?").toUpperCase());

  pvTipo.textContent = e.categoria || "Categoria";

  pvNome.textContent = e.nome || "Nome do evento";
  pvNome.classList.toggle("vazio", !e.nome);

  let quando = "";
  try {
    if (e.dataInicio) quando = formatarDataCompleta(e.dataInicio);
  } catch {
    // data incompleta: a prévia só não mostra a data
  }
  pvData.textContent = quando || "Data e horário";
  pvData.classList.toggle("vazio", !quando);

  const local = [e.localNome, e.cidade].filter(Boolean).join(" · ");
  pvLocal.textContent = local || "Local · Cidade";
  pvLocal.classList.toggle("vazio", !local);

  // Preço: menor valor entre os ingressos pagos; só gratuitos vira "Gratuito".
  const ingressos = lerIngressos();
  const pagos = ingressos.filter((i) => i.tipo === "pago" && i.valor > 0).map((i) => i.valor);
  if (pagos.length > 0) {
    const menor = Math.min(...pagos).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    pvPreco.textContent = `A partir de ${menor}`;
  } else if (ingressos.length > 0 && ingressos.every((i) => i.tipo === "gratuito")) {
    pvPreco.textContent = "Gratuito";
  } else {
    pvPreco.textContent = "";
  }
}

// Atualiza o botão e o campo escondido da imagem.
function definirImagem(url) {
  campoImagem.value = url ?? "";
  botaoRemover.hidden = !url;
  botaoEscolher.textContent = url ? "Trocar imagem" : "Escolher imagem";
  atualizarPrevia();
}

function avisoImagem(texto, ehErro = false) {
  msgImagem.textContent = texto;
  msgImagem.classList.toggle("erro", ehErro);
}

async function subirArquivo(arquivo) {
  const problema = validarImagem(arquivo);
  if (problema) {
    avisoImagem(problema, true);
    return;
  }

  // Bloqueia o envio do formulário enquanto a imagem sobe.
  botao.disabled = true;
  botaoEscolher.disabled = true;
  areaUpload.classList.add("carregando");
  avisoImagem("Enviando imagem...");

  try {
    definirImagem(await enviarImagem(arquivo));
    avisoImagem(MSG_IMAGEM);
  } catch (erro) {
    console.error(erro);
    avisoImagem(erro.message, true);
  } finally {
    botao.disabled = false;
    botaoEscolher.disabled = false;
    areaUpload.classList.remove("carregando");
    arquivoImagem.value = "";
  }
}

// Preenche o formulário com os dados do evento (modo edição).
function preencherFormulario(e) {
  const valores = {
    nome: e.nome,
    assunto: e.assunto,
    categoria: e.categoria,
    dataInicio: dataParaCampo(e.dataInicio),
    dataFim: dataParaCampo(e.dataFim),
    descricao: e.descricao,
    localNome: e.localNome,
    cep: e.cep,
    rua: e.rua,
    cidade: e.cidade,
    estado: e.estado,
    nomeProdutor: e.nomeProdutor,
    lugarId: e.lugarId,
  };

  for (const [nome, valor] of Object.entries(valores)) {
    const campo = form.elements[nome];
    if (campo) campo.value = valor ?? "";
  }

  definirImagem(e.imagem);
}

// Lê os campos de UMA linha de ingresso.
function lerLinha(linha) {
  return {
    titulo: linha.querySelector(".ing-titulo").value.trim(),
    tipo: linha.querySelector(".ing-tipo").value,
    valor: Number(linha.querySelector(".ing-valor").value || 0),
    quantidadeTotal: Number(linha.querySelector(".ing-quantidade").value),
  };
}

// Os campos das linhas de ingresso não têm "name", então o FormData ignora.
// Eles são lidos aqui, linha por linha.
function lerIngressos() {
  return [...elIngressos.querySelectorAll(".ingresso-linha")].map(lerLinha);
}

// Ingresso gratuito trava o valor em 0.
function atualizarTipo(linha) {
  const gratuito = linha.querySelector(".ing-tipo").value === "gratuito";
  const campoValor = linha.querySelector(".ing-valor");

  campoValor.disabled = gratuito;
  if (gratuito) campoValor.value = "0";
  else if (campoValor.value === "0") campoValor.value = "";
}

// Edição: cada linha ganha o botão "Salvar ingresso" e um espaço para o resultado.
function prepararLinhaEdicao(linha) {
  const barra = document.createElement("div");
  barra.className = "ingresso-acoes";
  barra.innerHTML = `
    <button class="botao-secundario ing-salvar" type="button">Salvar ingresso</button>
    <span class="ing-msg" role="status"></span>`;
  linha.appendChild(barra);
}

// Cria uma linha de ingresso. Com "ingresso", ela vem preenchida (já existe na API).
function adicionarLinhaIngresso(ingresso = null) {
  const linha = modelo.content.cloneNode(true).firstElementChild;

  if (ingresso) {
    linha.dataset.id = String(ingresso.id);
    linha.querySelector(".ing-titulo").value = ingresso.titulo;
    linha.querySelector(".ing-tipo").value = ingresso.tipo;
    linha.querySelector(".ing-valor").value = String(ingresso.valor);
    linha.querySelector(".ing-quantidade").value = String(ingresso.quantidadeTotal);
    atualizarTipo(linha);
  }

  if (editando) prepararLinhaEdicao(linha);

  elIngressos.appendChild(linha);
  atualizarPrevia();
  return linha;
}

function mostrarMsgLinha(linha, texto) {
  const elMsg = linha.querySelector(".ing-msg");
  if (elMsg) elMsg.textContent = texto;
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

// Na edição, as linhas de ingresso têm botão próprio e ficam fora da validação do evento.
function formularioValido() {
  if (!editando) return form.checkValidity();

  const invalido = [...form.elements].find(
    (campo) => !elIngressos.contains(campo) && !campo.checkValidity()
  );

  if (invalido) {
    invalido.reportValidity();
    return false;
  }
  return true;
}

// Salva uma linha: PUT se ela já existe na API, POST se é nova.
async function salvarLinha(linha) {
  const campos = [...linha.querySelectorAll("input, select")];
  const invalido = campos.find((campo) => !campo.checkValidity());
  if (invalido) {
    invalido.reportValidity();
    return;
  }

  const dados = lerLinha(linha);
  if (dados.tipo === "pago" && dados.valor <= 0) {
    mostrarMsgLinha(linha, "Ingresso pago precisa ter valor maior que 0.");
    return;
  }

  const botaoLinha = linha.querySelector(".ing-salvar");
  botaoLinha.disabled = true;
  mostrarMsgLinha(linha, "Salvando...");

  try {
    if (linha.dataset.id) {
      await atualizarIngresso(eventoId, Number(linha.dataset.id), dados);
    } else {
      const criado = await criarIngresso(eventoId, dados);
      linha.dataset.id = String(criado.id);
    }
    mostrarMsgLinha(linha, "Salvo.");
  } catch (erro) {
    console.error(erro);
    mostrarMsgLinha(linha, mensagemDoErro(erro)[0]);
  } finally {
    botaoLinha.disabled = false;
  }
}

// Remove uma linha. Se ela já existe na API (edição), apaga lá também, com confirmação.
async function removerLinha(linha) {
  const idIngresso = linha.dataset.id;

  if (!editando || !idIngresso) {
    linha.remove();
    atualizarPrevia();
    return;
  }

  const titulo = linha.querySelector(".ing-titulo").value.trim() || "este ingresso";
  if (!window.confirm(`Apagar o ingresso "${titulo}"? Isso não pode ser desfeito.`)) return;

  try {
    await apagarIngresso(eventoId, Number(idIngresso));
    linha.remove();
    atualizarPrevia();
  } catch (erro) {
    console.error(erro);
    mostrarMsgLinha(linha, mensagemDoErro(erro)[0]);
  }
}

// Modo edição: busca o evento, confere se a pessoa é a dona e preenche o formulário.
async function iniciarEdicao() {
  elTitulo.textContent = "Editar evento";
  elSub.textContent = "Mude o que quiser e veja a prévia ao lado.";
  elSeletor.hidden = true;
  botao.textContent = "Salvar alterações";
  form.hidden = true;

  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    elTitulo.textContent = "Evento não encontrado.";
    return;
  }

  try {
    // Os lugares precisam estar no select antes de marcar o lugar do evento.
    const [evento] = await Promise.all([buscarEvento(eventoId), carregarLugares()]);

    if (evento.usuarioId !== lerUsuario()?.id) {
      elTitulo.textContent = "Você não pode editar este evento.";
      return;
    }

    preencherFormulario(evento);

    const dica = document.createElement("p");
    dica.className = "suave";
    dica.textContent =
      "Cada ingresso é salvo no botão dele, separado do botão Salvar alterações do evento.";
    elIngressos.before(dica);

    try {
      const ingressos = await listarIngressos(eventoId);
      ingressos.forEach((ingresso) => adicionarLinhaIngresso(ingresso));
    } catch (erro) {
      console.error(erro);
      mostrarErros(["Não foi possível carregar os ingressos deste evento."]);
    }

    form.hidden = false;
  } catch (erro) {
    console.error(erro);
    elTitulo.textContent =
      erro.status === 404 ? "Evento não encontrado." : "Não foi possível carregar o evento.";
  }
}

// Eventos da tela
form.addEventListener("input", atualizarPrevia);
form.addEventListener("change", atualizarPrevia);

elLugar.addEventListener("change", () => {
  aplicarLugar();
  atualizarPrevia();
});

botaoAdicionar.addEventListener("click", () => adicionarLinhaIngresso());

elIngressos.addEventListener("click", (evento) => {
  const remover = evento.target.closest(".remover");
  if (remover) {
    removerLinha(remover.closest(".ingresso-linha"));
    return;
  }

  const salvar = evento.target.closest(".ing-salvar");
  if (salvar) salvarLinha(salvar.closest(".ingresso-linha"));
});

elIngressos.addEventListener("change", (evento) => {
  if (evento.target.matches(".ing-tipo")) {
    atualizarTipo(evento.target.closest(".ingresso-linha"));
    atualizarPrevia();
  }
});

// Mexeu na linha depois de salvar: o "Salvo." deixa de valer.
elIngressos.addEventListener("input", (evento) => {
  const linha = evento.target.closest(".ingresso-linha");
  if (linha) mostrarMsgLinha(linha, "");
});

botaoEscolher.addEventListener("click", () => arquivoImagem.click());

botaoRemover.addEventListener("click", () => {
  definirImagem("");
  avisoImagem(MSG_IMAGEM);
});

arquivoImagem.addEventListener("change", () => {
  if (arquivoImagem.files[0]) subirArquivo(arquivoImagem.files[0]);
});

// Arrastar e soltar a imagem na área pontilhada.
areaUpload.addEventListener("dragover", (evento) => {
  evento.preventDefault();
  areaUpload.classList.add("arrastando");
});

areaUpload.addEventListener("dragleave", () => areaUpload.classList.remove("arrastando"));

areaUpload.addEventListener("drop", (evento) => {
  evento.preventDefault();
  areaUpload.classList.remove("arrastando");
  const arquivo = evento.dataTransfer.files[0];
  if (arquivo) subirArquivo(arquivo);
});

form.addEventListener("submit", async (evento) => {
  // Impede o navegador de recarregar a página.
  evento.preventDefault();
  esconderMensagens();

  // Validação do HTML (required, minlength, pattern...) antes de chamar a API.
  if (!formularioValido()) return;

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

definirImagem("");

// Só prepara a tela se a pessoa está logada (senão o redirecionamento acima já foi pedido).
if (estaLogada()) {
  if (editando) {
    iniciarEdicao();
  } else {
    carregarLugares();
    // Começa com uma linha de ingresso pronta (dá para remover).
    adicionarLinhaIngresso();
  }
}
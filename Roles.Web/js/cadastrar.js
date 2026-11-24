import {
  buscarEvento,
  criarEvento,
  atualizarEvento,
  criarIngresso,
  listarIngressos,
  atualizarIngresso,
  apagarIngresso,
  buscarLugar,
  criarLugar,
  atualizarLugar,
  listarLugares,
} from "./api.js";
import { estaLogada, lerUsuario } from "./auth.js";
import { escapar, mensagemDoErro, formatarDataCompleta } from "./util.js";
import { NOMES_DIAS, situacao } from "./horarios.js";
import { enviarImagem, validarImagem } from "./upload.js";

const CATEGORIAS = ["Shows", "Festivais", "Teatro", "Gastronomia", "Esportes"];

// Deve ser igual à lista da API (Roles.Api/Models/LugarTipos.cs).
const TIPOS = ["Bar", "Balada", "Restaurante", "Café", "Pub", "Lounge", "Casa de shows", "Karaokê", "Parque", "Outro"];

// Segunda a domingo na tela (0 = domingo, como a API espera).
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const MSG_IMAGEM = "JPG, PNG ou WebP, até 5 MB.";

// cadastrar.html?tipo=evento|lugar         -> cadastrar
// cadastrar.html?tipo=lugar&id=3           -> editar o lugar 3
const parametros = new URLSearchParams(window.location.search);
const editando = parametros.has("id");
const itemId = Number(parametros.get("id"));
let modo = parametros.get("tipo") === "lugar" ? "lugar" : "evento";

// Só quem está logada cadastra ou edita. Se não estiver, vai para o login.
if (!estaLogada()) {
  window.location.replace(`login.html?voltar=${encodeURIComponent("cadastrar.html" + window.location.search)}`);
}

const $ = (id) => document.getElementById(id);
const form = $("form-cadastro");
const elTitulo = $("cad-titulo");
const elSub = $("cad-sub");
const elRail = $("cad-rail");
const elOpcoes = $("cad-opcoes");
const elErros = $("erros");
const elAviso = $("aviso");
const botaoSalvar = $("botao-salvar");
const botaoContinuar = $("cad-continuar");
const botaoVoltar = $("cad-voltar");
const linkCancelar = $("cad-cancelar");

const inputCategoria = $("categoria");
const inputTipo = $("tipo");
const chipsCategoria = $("chips-categoria");
const chipsTipo = $("chips-tipo");

const elLugar = $("lugar-id");
const elLugarDica = $("lugar-dica");
const elIngressos = $("lista-ingressos");
const modeloIngresso = $("modelo-ingresso");
const elHorarios = $("horarios");

const campoImagem = $("imagem");
const arquivoImagem = $("arquivo-imagem");
const areaUpload = $("upload-area");
const botaoEscolher = $("upload-escolher");
const botaoRemover = $("upload-remover");
const msgImagem = $("upload-msg");

const pv = {
  capa: $("pv-capa"),
  tipo: $("pv-tipo"),
  nome: $("pv-nome"),
  l1: $("pv-l1"),
  l2: $("pv-l2"),
  l3: $("pv-l3"),
};

let etapas = [];
let atual = 0;
let maxAlcancada = 0;
let feitas = new Set();
let lugares = [];

/* ---------- utilidades ---------- */

// Texto em branco vira null (a API entende como "não informado").
function textoOuNulo(valor) {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

// O campo datetime-local entrega "2027-01-15T19:00"; a API espera os segundos.
const dataParaApi = (valor) => (valor ? `${valor}:00` : null);

// A API devolve "2027-01-15T19:00:00"; o campo datetime-local quer "2027-01-15T19:00".
const dataParaCampo = (iso) => (iso ? iso.slice(0, 16) : "");

// Campo ativo com esse nome (os do outro modo ficam desativados).
function campo(nome) {
  return form.querySelector(`[name="${nome}"]:not(:disabled)`);
}

function definirCampo(nome, valor) {
  const el = campo(nome);
  if (el) el.value = valor ?? "";
}

/* ---------- modo (evento ou lugar) e etapas ---------- */

function aplicarModo() {
  // A cor da página muda conforme o tipo (roxo para evento, azul-petróleo para lugar).
  document.body.dataset.cad = modo;

  document.querySelectorAll("[data-modo]").forEach((el) => {
    const ativo = el.dataset.modo === "ambos" || el.dataset.modo === modo;
    el.hidden = !ativo;
    // Um fieldset desativado tira os campos dele do envio e da validação.
    if (el.tagName === "FIELDSET") el.disabled = !ativo;
  });

  elOpcoes.querySelectorAll("[data-escolha]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.escolha === modo));
  });

  etapas = [...form.querySelectorAll(".etapa")].filter((e) => !e.disabled);

  const nome = campo("nome");
  if (nome) nome.placeholder = modo === "evento" ? "Ex.: Noite de Samba" : "Ex.: Pub do Teste";

  const texto = editando ? "Salvar alterações" : modo === "evento" ? "Publicar evento" : "Cadastrar lugar";
  botaoSalvar.textContent = texto;
  linkCancelar.href = modo === "evento" ? "index.html" : "lugares.html";
}

function mostrarEtapa(i) {
  atual = i;
  maxAlcancada = Math.max(maxAlcancada, i);
  etapas.forEach((e, j) => {
    e.hidden = j !== i;
  });

  const etapa = etapas[i];
  const ultima = i === etapas.length - 1;
  botaoContinuar.hidden = ultima;
  botaoSalvar.hidden = !ultima;
  botaoVoltar.hidden = i === 0;
  linkCancelar.hidden = i !== 0;

  if (i === 0 && editando) {
    elTitulo.textContent = modo === "evento" ? "Editar evento" : "Editar lugar";
    elSub.textContent = "Mude o que quiser e veja a prévia ao lado.";
  } else {
    elTitulo.textContent = etapa.dataset.h;
    elSub.textContent = etapa.dataset.sub;
  }

  esconderMensagens();
  desenharRail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function desenharRail() {
  const itens = etapas
    .map((e, i) => {
      const feita = feitas.has(i) && i !== atual;
      const classes = ["rail-item", i === atual ? "atual" : "", feita ? "feita" : ""].join(" ").trim();
      return `<li><button type="button" class="${classes}" data-etapa="${i}" ${i > maxAlcancada ? "disabled" : ""}
        ${i === atual ? 'aria-current="step"' : ""}>
        <span class="rail-num">${feita ? "✓" : i + 1}</span>${escapar(e.dataset.titulo)}</button></li>`;
    })
    .join("");

  const pct = Math.round((feitas.size / etapas.length) * 100);
  elRail.innerHTML = `
    <span class="rail-resumo">${feitas.size} de ${etapas.length} etapas prontas</span>
    <div class="rail-barra"><div style="width:${pct}%"></div></div>
    <ol class="rail-lista">${itens}</ol>`;
}

// Troca entre Evento e Lugar (só na criação): volta para a etapa 1.
function trocarModo(novo) {
  if (editando || novo === modo) return;
  modo = novo;
  feitas = new Set();
  maxAlcancada = 0;
  aplicarModo();
  mostrarEtapa(0);
  atualizarPrevia();

  const url = new URL(window.location.href);
  url.searchParams.set("tipo", modo);
  window.history.replaceState(null, "", url);
}

/* ---------- categoria e tipo (botões) ---------- */

function marcarChips(container, input) {
  container.querySelectorAll(".cad-chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.valor === input.value));
  });
}

function montarChips(container, valores) {
  container.innerHTML = valores
    .map((v) => `<button type="button" class="cad-chip" aria-pressed="false" data-valor="${escapar(v)}">${escapar(v)}</button>`)
    .join("");
}

// Categoria digitada por outra pessoa (que não está nos botões) ganha um botão próprio.
function garantirChip(container, valor) {
  if (!valor || container.querySelector(`[data-valor="${CSS.escape(valor)}"]`)) return;
  container.insertAdjacentHTML(
    "beforeend",
    `<button type="button" class="cad-chip" aria-pressed="false" data-valor="${escapar(valor)}">${escapar(valor)}</button>`
  );
}

function ligarChips(container, input) {
  container.addEventListener("click", (evento) => {
    const chip = evento.target.closest(".cad-chip");
    if (!chip) return;
    // Clicar de novo no botão marcado desmarca (a categoria é opcional).
    input.value = input.value === chip.dataset.valor ? "" : chip.dataset.valor;
    marcarChips(container, input);
    atualizarPrevia();
  });
}

/* ---------- leitura dos dados ---------- */

function lerEvento() {
  const c = new FormData(form);
  const lugar = c.get("lugarId");
  return {
    nome: String(c.get("nome") ?? "").trim(),
    assunto: textoOuNulo(c.get("assunto")),
    categoria: textoOuNulo(c.get("categoria")),
    imagem: textoOuNulo(c.get("imagem")),
    dataInicio: dataParaApi(c.get("dataInicio")),
    dataFim: dataParaApi(c.get("dataFim")),
    descricao: textoOuNulo(c.get("descricao")),
    localNome: textoOuNulo(c.get("localNome")),
    cep: textoOuNulo(c.get("cep")),
    rua: textoOuNulo(c.get("rua")),
    cidade: textoOuNulo(c.get("cidade")),
    estado: textoOuNulo(c.get("estado")),
    nomeProdutor: textoOuNulo(c.get("nomeProdutor")),
    // A API troca o lugar a cada PUT, então ele sempre vai junto.
    lugarId: lugar ? Number(lugar) : null,
  };
}

function lerLugar() {
  const c = new FormData(form);
  const faixa = c.get("faixaPreco");
  return {
    nome: String(c.get("nome") ?? "").trim(),
    tipo: String(c.get("tipo") ?? ""),
    descricao: textoOuNulo(c.get("descricao")),
    imagem: textoOuNulo(c.get("imagem")),
    faixaPreco: faixa ? Number(faixa) : null,
    cep: textoOuNulo(c.get("cep")),
    rua: textoOuNulo(c.get("rua")),
    bairro: textoOuNulo(c.get("bairro")),
    cidade: String(c.get("cidade") ?? "").trim(),
    estado: textoOuNulo(c.get("estado")),
    telefone: textoOuNulo(c.get("telefone")),
    instagram: textoOuNulo(c.get("instagram")),
  };
}

/* ---------- horários do lugar ---------- */

function montarHorarios() {
  elHorarios.innerHTML = ORDEM_DIAS.map(
    (dia) => `
      <div class="horario-linha" data-dia="${dia}">
        <span class="horario-dia">${escapar(NOMES_DIAS[dia])}</span>
        <input class="h-abre" type="time" aria-label="Abre, ${escapar(NOMES_DIAS[dia])}">
        <input class="h-fecha" type="time" aria-label="Fecha, ${escapar(NOMES_DIAS[dia])}">
        <label class="fechado-opcao"><input class="h-fechado" type="checkbox"> Fechado</label>
      </div>`
  ).join("");
}

function estadoDaLinha(linha) {
  return {
    fechado: linha.querySelector(".h-fechado").checked,
    abre: linha.querySelector(".h-abre").value,
    fecha: linha.querySelector(".h-fecha").value,
  };
}

// "Fechado" trava e limpa os campos de hora.
function aplicarLinha(linha, { fechado, abre, fecha }) {
  const campoAbre = linha.querySelector(".h-abre");
  const campoFecha = linha.querySelector(".h-fecha");
  linha.querySelector(".h-fechado").checked = fechado;
  campoAbre.disabled = fechado;
  campoFecha.disabled = fechado;
  campoAbre.value = fechado ? "" : abre ?? "";
  campoFecha.value = fechado ? "" : fecha ?? "";
}

// Dia sem nada preenchido não é enviado; dia pela metade vira aviso.
function lerHorarios() {
  const horarios = [];
  const problemas = [];

  for (const linha of elHorarios.querySelectorAll(".horario-linha")) {
    const dia = Number(linha.dataset.dia);
    const { fechado, abre, fecha } = estadoDaLinha(linha);

    if (fechado) {
      horarios.push({ diaSemana: dia, fechado: true });
      continue;
    }
    if (!abre && !fecha) continue;
    if (!abre || !fecha) {
      problemas.push(`${NOMES_DIAS[dia]}: informe a hora de abertura e a de fechamento.`);
      continue;
    }
    horarios.push({ diaSemana: dia, fechado: false, abre, fecha });
  }
  return { horarios, problemas };
}

/* ---------- ingressos do evento ---------- */

function lerLinha(linha) {
  return {
    titulo: linha.querySelector(".ing-titulo").value.trim(),
    tipo: linha.querySelector(".ing-tipo").value,
    valor: Number(linha.querySelector(".ing-valor").value || 0),
    quantidadeTotal: Number(linha.querySelector(".ing-quantidade").value),
  };
}

// Os campos das linhas de ingresso não têm "name", então são lidos linha por linha.
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
  const linha = modeloIngresso.content.cloneNode(true).firstElementChild;

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

// Salva uma linha (só na edição): PUT se ela já existe na API, POST se é nova.
async function salvarLinha(linha) {
  const invalido = [...linha.querySelectorAll("input, select")].find((c) => !c.checkValidity());
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
      await atualizarIngresso(itemId, Number(linha.dataset.id), dados);
    } else {
      const criado = await criarIngresso(itemId, dados);
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
    await apagarIngresso(itemId, Number(idIngresso));
    linha.remove();
    atualizarPrevia();
  } catch (erro) {
    console.error(erro);
    mostrarMsgLinha(linha, mensagemDoErro(erro)[0]);
  }
}

/* ---------- lugares cadastrados (select do evento) ---------- */

async function carregarLugares() {
  if (lugares.length > 0) return;

  try {
    lugares = await listarLugares();
  } catch (erro) {
    console.error(erro);
    elLugarDica.textContent = "Não foi possível carregar os lugares. Você ainda pode informar o local abaixo.";
    return;
  }

  elLugar.insertAdjacentHTML(
    "beforeend",
    lugares
      .map((l) => {
        const detalhe = [l.cidade, l.estado].filter(Boolean).join("/");
        return `<option value="${Number(l.id)}">${escapar(detalhe ? `${l.nome} · ${detalhe}` : l.nome)}</option>`;
      })
      .join("")
  );
}

// Escolheu um lugar: copia o endereço dele para os campos do local.
function aplicarLugar() {
  const lugar = lugares.find((l) => String(l.id) === elLugar.value);
  if (!lugar) return;

  definirCampo("localNome", lugar.nome);
  definirCampo("cep", lugar.cep);
  definirCampo("rua", lugar.rua);
  definirCampo("cidade", lugar.cidade);
  definirCampo("estado", lugar.estado);
}

/* ---------- prévia ao vivo ---------- */

// Campo vazio vira traço cinza (classe "vazio") com um texto de exemplo invisível.
function texto(el, valor, exemplo) {
  el.textContent = valor || exemplo;
  el.classList.toggle("vazio", !valor);
}

function atualizarPrevia() {
  if (modo === "evento") {
    const e = lerEvento();

    pv.capa.innerHTML = e.imagem ? `<img src="${escapar(e.imagem)}" alt="">` : "A capa aparece aqui";
    texto(pv.tipo, e.categoria, "Categoria");
    texto(pv.nome, e.nome, "Nome do evento");

    let quando = "";
    try {
      if (e.dataInicio) quando = formatarDataCompleta(e.dataInicio);
    } catch {
      // data incompleta: a prévia só não mostra a data
    }
    texto(pv.l1, quando, "Data e horário");

    texto(pv.l2, [e.localNome, e.cidade].filter(Boolean).join(" · "), "Local · Cidade");
    pv.l2.hidden = false;

    // Preço: menor valor entre os ingressos pagos; só gratuitos vira "Gratuito".
    const ingressos = lerIngressos();
    const pagos = ingressos.filter((i) => i.tipo === "pago" && i.valor > 0).map((i) => i.valor);
    let preco = "";
    if (pagos.length > 0) {
      preco = `A partir de ${Math.min(...pagos).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
    } else if (ingressos.length > 0 && ingressos.every((i) => i.tipo === "gratuito")) {
      preco = "Gratuito";
    }
    texto(pv.l3, preco, "A partir de R$ 00,00");
    pv.l3.classList.remove("fechado");
    return;
  }

  const l = lerLugar();
  const faixa = Math.min(3, Math.max(0, Number(l.faixaPreco) || 0));

  pv.capa.innerHTML = l.imagem ? `<img src="${escapar(l.imagem)}" alt="">` : "A capa aparece aqui";
  texto(pv.tipo, l.tipo ? (faixa ? `${l.tipo} · ${"$".repeat(faixa)}` : l.tipo) : "", "Tipo do lugar");
  texto(pv.nome, l.nome, "Nome do lugar");
  texto(pv.l1, [l.bairro, l.cidade].filter(Boolean).join(" · "), "Bairro · Cidade");
  pv.l2.hidden = true;

  let situ = null;
  try {
    situ = situacao(lerHorarios().horarios);
  } catch {
    // horário incompleto: a prévia só não mostra a situação
  }
  texto(pv.l3, situ ? situ.texto : "", "Aberto agora · fecha às 00:00");
  pv.l3.classList.toggle("fechado", Boolean(situ) && !situ.aberto);
}

/* ---------- imagem de capa ---------- */

function definirImagem(url) {
  campoImagem.value = url ?? "";
  botaoRemover.hidden = !url;
  botaoEscolher.textContent = url ? "Trocar imagem" : "Escolher imagem";
  atualizarPrevia();
}

function avisoImagem(textoAviso, ehErro = false) {
  msgImagem.textContent = textoAviso;
  msgImagem.classList.toggle("erro", ehErro);
}

async function subirArquivo(arquivo) {
  const problema = validarImagem(arquivo);
  if (problema) {
    avisoImagem(problema, true);
    return;
  }

  // Bloqueia o avanço enquanto a imagem sobe.
  botaoContinuar.disabled = true;
  botaoSalvar.disabled = true;
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
    botaoContinuar.disabled = false;
    botaoSalvar.disabled = false;
    botaoEscolher.disabled = false;
    areaUpload.classList.remove("carregando");
    arquivoImagem.value = "";
  }
}

/* ---------- mensagens e validação por etapa ---------- */

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

// Devolve o problema da etapa ({ campo } ou { mensagens }) ou null se está tudo certo.
function problemaDaEtapa(i) {
  const etapa = etapas[i];

  // Na edição, as linhas de ingresso têm botão próprio e ficam fora da validação.
  const controles = [...etapa.querySelectorAll("input, select, textarea")].filter(
    (c) => !c.matches(":disabled") && !(editando && elIngressos.contains(c))
  );
  const invalido = controles.find((c) => !c.checkValidity());
  if (invalido) return { campo: invalido };

  const mensagens = [];

  if (modo === "lugar" && etapa.contains(inputTipo) && !inputTipo.value) {
    mensagens.push("Escolha o tipo do lugar.");
  }

  if (modo === "lugar" && etapa.contains(elHorarios)) {
    mensagens.push(...lerHorarios().problemas);
  }

  if (modo === "evento" && etapa.contains($("dataFim"))) {
    const e = lerEvento();
    if (e.dataFim && e.dataFim < e.dataInicio) {
      mensagens.push("A data de término não pode ser anterior à data de início.");
    }
  }

  if (modo === "evento" && !editando && etapa.contains(elIngressos)) {
    const semValor = lerIngressos().find((ing) => ing.tipo === "pago" && ing.valor <= 0);
    if (semValor) {
      mensagens.push(`O ingresso "${semValor.titulo}" é pago e precisa ter valor maior que 0.`);
    }
  }

  return mensagens.length > 0 ? { mensagens } : null;
}

function mostrarProblema(problema) {
  if (problema.campo) problema.campo.reportValidity();
  else mostrarErros(problema.mensagens);
}

function avancar() {
  const problema = problemaDaEtapa(atual);
  if (problema) {
    mostrarProblema(problema);
    return;
  }
  feitas.add(atual);
  mostrarEtapa(atual + 1);
}

/* ---------- envio ---------- */

async function enviarLugar() {
  const { horarios } = lerHorarios();
  const dados = { ...lerLugar(), horarios };

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = editando ? "Salvando..." : "Cadastrando...";

  try {
    if (editando) {
      await atualizarLugar(itemId, dados);
      window.location.href = `lugar.html?id=${itemId}`;
    } else {
      const criado = await criarLugar(dados);
      window.location.href = `lugar.html?id=${criado.id}`;
    }
  } catch (erro) {
    console.error(erro);
    mostrarErros(mensagemDoErro(erro));
    botaoSalvar.disabled = false;
    aplicarModo();
  }
}

async function enviarEvento() {
  const dados = lerEvento();

  // Modo edição: um único PUT com os dados do evento.
  if (editando) {
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";

    try {
      await atualizarEvento(itemId, dados);
      window.location.href = `evento.html?id=${itemId}`;
    } catch (erro) {
      console.error(erro);
      mostrarErros(mensagemDoErro(erro));
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = "Salvar alterações";
    }
    return;
  }

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Publicando...";

  // Passo 1: cria o evento.
  let criado;
  try {
    criado = await criarEvento(dados);
  } catch (erro) {
    console.error(erro);
    mostrarErros(mensagemDoErro(erro));
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Publicar evento";
    return;
  }

  // Passo 2: cria os ingressos, um por vez, com o id do evento recém-criado.
  const falhas = [];
  for (const ingresso of lerIngressos()) {
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

  // O evento já existe: esconde os botões para não criar o mesmo evento duas vezes.
  botaoSalvar.hidden = true;
  botaoVoltar.hidden = true;
  mostrarAvisoParcial(criado.id, falhas);
}

/* ---------- edição ---------- */

function preencherEvento(e) {
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
  for (const [nome, valor] of Object.entries(valores)) definirCampo(nome, valor);

  garantirChip(chipsCategoria, e.categoria);
  marcarChips(chipsCategoria, inputCategoria);
  definirImagem(e.imagem);
}

function preencherLugar(l) {
  const valores = {
    nome: l.nome,
    tipo: l.tipo,
    faixaPreco: l.faixaPreco,
    descricao: l.descricao,
    cep: l.cep,
    rua: l.rua,
    bairro: l.bairro,
    cidade: l.cidade,
    estado: l.estado,
    telefone: l.telefone,
    instagram: l.instagram,
  };
  for (const [nome, valor] of Object.entries(valores)) definirCampo(nome, valor);

  garantirChip(chipsTipo, l.tipo);
  marcarChips(chipsTipo, inputTipo);

  for (const h of l.horarios ?? []) {
    const linha = elHorarios.querySelector(`[data-dia="${Number(h.diaSemana)}"]`);
    if (!linha) continue;
    aplicarLinha(linha, {
      fechado: Boolean(h.fechado),
      abre: h.abre ? String(h.abre).slice(0, 5) : "",
      fecha: h.fecha ? String(h.fecha).slice(0, 5) : "",
    });
  }
  definirImagem(l.imagem);
}

async function iniciarEdicao() {
  const nomeTipo = modo === "evento" ? "evento" : "lugar";
  elOpcoes.hidden = true;
  form.hidden = true;
  elRail.hidden = true;

  if (!Number.isInteger(itemId) || itemId <= 0) {
    elTitulo.textContent = `${nomeTipo === "evento" ? "Evento" : "Lugar"} não encontrado.`;
    elSub.textContent = "";
    return;
  }

  try {
    if (modo === "evento") {
      // Os lugares precisam estar no select antes de marcar o lugar do evento.
      const [evento] = await Promise.all([buscarEvento(itemId), carregarLugares()]);

      if (evento.usuarioId !== lerUsuario()?.id) {
        elTitulo.textContent = "Você não pode editar este evento.";
        elSub.textContent = "";
        return;
      }

      preencherEvento(evento);

      const dica = document.createElement("p");
      dica.className = "cad-dica";
      dica.textContent = "Cada ingresso é salvo no botão dele, separado do botão Salvar alterações do evento.";
      elIngressos.before(dica);

      try {
        (await listarIngressos(itemId)).forEach((ingresso) => adicionarLinhaIngresso(ingresso));
      } catch (erro) {
        console.error(erro);
        mostrarErros(["Não foi possível carregar os ingressos deste evento."]);
      }
    } else {
      const lugar = await buscarLugar(itemId);

      if (lugar.usuarioId !== lerUsuario()?.id) {
        elTitulo.textContent = "Você não pode editar este lugar.";
        elSub.textContent = "";
        return;
      }

      preencherLugar(lugar);
    }

    // Na edição todas as etapas já estão prontas e abertas.
    feitas = new Set(etapas.map((_, i) => i));
    maxAlcancada = etapas.length - 1;
    form.hidden = false;
    elRail.hidden = false;
    mostrarEtapa(0);
  } catch (erro) {
    console.error(erro);
    elTitulo.textContent =
      erro.status === 404
        ? `${nomeTipo === "evento" ? "Evento" : "Lugar"} não encontrado.`
        : `Não foi possível carregar o ${nomeTipo}.`;
    elSub.textContent = "";
  }
}

/* ---------- eventos da tela ---------- */

form.addEventListener("input", atualizarPrevia);
form.addEventListener("change", atualizarPrevia);

elOpcoes.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-escolha]");
  if (botao) trocarModo(botao.dataset.escolha);
});

elRail.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-etapa]");
  if (botao) mostrarEtapa(Number(botao.dataset.etapa));
});

botaoContinuar.addEventListener("click", avancar);
botaoVoltar.addEventListener("click", () => mostrarEtapa(atual - 1));

elLugar.addEventListener("change", aplicarLugar);

$("adicionar-ingresso").addEventListener("click", () => adicionarLinhaIngresso());

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

elHorarios.addEventListener("change", (evento) => {
  if (!evento.target.matches(".h-fechado")) return;
  const linha = evento.target.closest(".horario-linha");
  aplicarLinha(linha, estadoDaLinha(linha));
  atualizarPrevia();
});

$("copiar-horario").addEventListener("click", () => {
  const segunda = elHorarios.querySelector('[data-dia="1"]');
  const estado = estadoDaLinha(segunda);
  elHorarios.querySelectorAll(".horario-linha").forEach((linha) => {
    if (linha !== segunda) aplicarLinha(linha, estado);
  });
  atualizarPrevia();
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
  if (evento.dataTransfer.files[0]) subirArquivo(evento.dataTransfer.files[0]);
});

form.addEventListener("submit", async (evento) => {
  // Impede o navegador de recarregar a página.
  evento.preventDefault();

  // Enter num campo de uma etapa do meio só avança.
  if (atual < etapas.length - 1) {
    avancar();
    return;
  }

  esconderMensagens();

  // Confere todas as etapas, na ordem, e leva a pessoa à primeira com problema.
  for (let i = 0; i < etapas.length; i++) {
    const problema = problemaDaEtapa(i);
    if (problema) {
      mostrarEtapa(i);
      mostrarProblema(problema);
      return;
    }
  }

  if (modo === "lugar") await enviarLugar();
  else await enviarEvento();
});

/* ---------- início ---------- */

montarChips(chipsCategoria, CATEGORIAS);
montarChips(chipsTipo, TIPOS);
ligarChips(chipsCategoria, inputCategoria);
ligarChips(chipsTipo, inputTipo);
montarHorarios();
aplicarModo();
definirImagem("");
mostrarEtapa(0);

// Só prepara a tela se a pessoa está logada (senão o redirecionamento acima já foi pedido).
if (estaLogada()) {
  carregarLugares();
  if (editando) {
    iniciarEdicao();
  } else {
    // Começa com uma linha de ingresso pronta (dá para remover).
    adicionarLinhaIngresso();
  }
}
import { buscarLugar, criarLugar, atualizarLugar } from "./api.js";
import { estaLogada, lerUsuario } from "./auth.js";
import { escapar, mensagemDoErro } from "./util.js";
import { NOMES_DIAS } from "./horarios.js";

// Deve ser igual à lista da API (Roles.Api/Models/LugarTipos.cs).
const TIPOS = [
  "Bar",
  "Balada",
  "Restaurante",
  "Café",
  "Pub",
  "Lounge",
  "Casa de shows",
  "Karaokê",
  "Parque",
  "Outro",
];

// Segunda a domingo na tela (0 = domingo, como a API espera).
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

// criar-lugar.html        -> cadastrar
// criar-lugar.html?id=3   -> editar o lugar 3
const parametros = new URLSearchParams(window.location.search);
const editando = parametros.has("id");
const lugarId = Number(parametros.get("id"));

// Só quem está logada cadastra ou edita. Se não estiver, vai para o login.
if (!estaLogada()) {
  window.location.replace(editando ? "login.html" : "login.html?voltar=criar-lugar.html");
}

const form = document.getElementById("form-lugar");
const elTitulo = document.querySelector("h1.titulo");
const elErros = document.getElementById("erros");
const botao = document.getElementById("botao-salvar");
const elTipo = document.getElementById("tipo");
const elHorarios = document.getElementById("horarios");
const botaoCopiar = document.getElementById("copiar-horario");

// Texto em branco vira null (a API entende como "não informado").
function textoOuNulo(valor) {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

function montarTipos() {
  const opcoes = TIPOS.map((t) => `<option value="${escapar(t)}">${escapar(t)}</option>`).join("");
  elTipo.innerHTML = `<option value="">Escolha o tipo</option>${opcoes}`;
}

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

function lerLugar() {
  const campos = new FormData(form);
  const faixa = campos.get("faixaPreco");

  return {
    nome: String(campos.get("nome")).trim(),
    tipo: String(campos.get("tipo")),
    descricao: textoOuNulo(campos.get("descricao")),
    imagem: textoOuNulo(campos.get("imagem")),
    faixaPreco: faixa ? Number(faixa) : null,
    cep: textoOuNulo(campos.get("cep")),
    rua: textoOuNulo(campos.get("rua")),
    bairro: textoOuNulo(campos.get("bairro")),
    cidade: String(campos.get("cidade")).trim(),
    estado: textoOuNulo(campos.get("estado")),
    telefone: textoOuNulo(campos.get("telefone")),
    instagram: textoOuNulo(campos.get("instagram")),
  };
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

// Preenche o formulário com os dados do lugar (modo edição).
function preencherFormulario(l) {
  const valores = {
    nome: l.nome,
    tipo: l.tipo,
    faixaPreco: l.faixaPreco,
    descricao: l.descricao,
    imagem: l.imagem,
    cep: l.cep,
    rua: l.rua,
    bairro: l.bairro,
    cidade: l.cidade,
    estado: l.estado,
    telefone: l.telefone,
    instagram: l.instagram,
  };

  for (const [nome, valor] of Object.entries(valores)) {
    const campo = form.elements[nome];
    if (campo) campo.value = valor ?? "";
  }

  for (const h of l.horarios ?? []) {
    const linha = elHorarios.querySelector(`[data-dia="${Number(h.diaSemana)}"]`);
    if (!linha) continue;

    aplicarLinha(linha, {
      fechado: Boolean(h.fechado),
      abre: h.abre ? String(h.abre).slice(0, 5) : "",
      fecha: h.fecha ? String(h.fecha).slice(0, 5) : "",
    });
  }
}

function mostrarErros(mensagens) {
  elErros.innerHTML = `<ul>${mensagens.map((m) => `<li>${escapar(m)}</li>`).join("")}</ul>`;
  elErros.hidden = false;
  elErros.scrollIntoView({ behavior: "smooth", block: "center" });
}

function esconderErros() {
  elErros.hidden = true;
  elErros.innerHTML = "";
}

// Modo edição: busca o lugar, confere se a pessoa é a dona e preenche o formulário.
async function iniciarEdicao() {
  elTitulo.textContent = "Editar lugar";
  botao.textContent = "Salvar alterações";
  form.hidden = true;

  if (!Number.isInteger(lugarId) || lugarId <= 0) {
    elTitulo.textContent = "Lugar não encontrado.";
    return;
  }

  try {
    const lugar = await buscarLugar(lugarId);

    if (lugar.usuarioId !== lerUsuario()?.id) {
      elTitulo.textContent = "Você não pode editar este lugar.";
      return;
    }

    preencherFormulario(lugar);
    form.hidden = false;
  } catch (erro) {
    console.error(erro);
    elTitulo.textContent =
      erro.status === 404 ? "Lugar não encontrado." : "Não foi possível carregar o lugar.";
  }
}

// Eventos da tela
elHorarios.addEventListener("change", (evento) => {
  if (!evento.target.matches(".h-fechado")) return;

  const linha = evento.target.closest(".horario-linha");
  aplicarLinha(linha, estadoDaLinha(linha));
});

botaoCopiar.addEventListener("click", () => {
  const segunda = elHorarios.querySelector('[data-dia="1"]');
  const estado = estadoDaLinha(segunda);

  elHorarios.querySelectorAll(".horario-linha").forEach((linha) => {
    if (linha !== segunda) aplicarLinha(linha, estado);
  });
});

form.addEventListener("submit", async (evento) => {
  // Impede o navegador de recarregar a página.
  evento.preventDefault();
  esconderErros();

  // Validação do HTML (required, minlength, pattern...) antes de chamar a API.
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const { horarios, problemas } = lerHorarios();
  if (problemas.length > 0) {
    mostrarErros(problemas);
    return;
  }

  const dados = { ...lerLugar(), horarios };

  botao.disabled = true;
  botao.textContent = editando ? "Salvando..." : "Cadastrando...";

  try {
    if (editando) {
      await atualizarLugar(lugarId, dados);
      window.location.href = `lugar.html?id=${lugarId}`;
    } else {
      const criado = await criarLugar(dados);
      window.location.href = `lugar.html?id=${criado.id}`;
    }
  } catch (erro) {
    console.error(erro);
    mostrarErros(mensagemDoErro(erro));
    botao.disabled = false;
    botao.textContent = editando ? "Salvar alterações" : "Cadastrar lugar";
  }
});

montarTipos();
montarHorarios();

// Só prepara a edição se a pessoa está logada (senão o redirecionamento acima já foi pedido).
if (estaLogada() && editando) {
  iniciarEdicao();
}
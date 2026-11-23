import { listarEventos } from "./api.js";
import { escapar } from "./util.js";
import { montarCarrossel } from "./carrossel.js";

const elCidade = document.getElementById("cidade");
const elCidadeBotao = document.getElementById("cidade-botao");
const elCidadeTexto = document.getElementById("cidade-texto");
const elCidadeLista = document.getElementById("cidade-lista");
const elCategorias = document.getElementById("filtro-categorias");
const elBusca = document.getElementById("busca");
const elStatus = document.getElementById("status");
const elAcoes = document.getElementById("acoes");
const elLista = document.getElementById("lista");
const elNumeros = document.getElementById("numeros");
const elCarrossel = document.getElementById("carrossel");

// Todos os eventos ficam em memória: os filtros trabalham em cima desta lista.
let todos = [];
const filtros = { cidade: "", categoria: "", busca: "" };

const formatoDiaHora = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const ICONE_RELOGIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const ICONE_LOCAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

function plural(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function dataValida(iso) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

// Tira acentos e maiúsculas para a busca achar "musica" em "Música".
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function valoresUnicos(campo) {
  const valores = todos.map((e) => e[campo]).filter(Boolean);
  return [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function temFiltro() {
  return Boolean(filtros.cidade || filtros.categoria || filtros.busca.trim());
}

function montarCidades() {
  const itens = ["", ...valoresUnicos("cidade")];
  elCidadeLista.innerHTML = itens
    .map((c) => {
      const ativo = c === filtros.cidade;
      return `<li role="option" class="cidade-op${ativo ? " ativo" : ""}" data-cidade="${escapar(c)}" aria-selected="${ativo}">${c ? escapar(c) : "Todas as cidades"}</li>`;
    })
    .join("");
  elCidadeTexto.textContent = filtros.cidade || "Todas as cidades";
}

function preencherFiltros() {
  filtros.cidade = "";
  filtros.categoria = "";
  filtros.busca = "";
  elBusca.value = "";

  montarCidades();

  const categorias = valoresUnicos("categoria")
    .map((c) => `<button type="button" class="chip" data-categoria="${escapar(c)}">${escapar(c)}</button>`)
    .join("");
  elCategorias.innerHTML = `<button type="button" class="chip ativo" data-categoria="">Todos</button>${categorias}`;
}
// Números do topo da página, calculados com os eventos reais.
function mostrarNumeros() {
  if (todos.length === 0) {
    elNumeros.hidden = true;
    return;
  }

  const itens = [
    [todos.length, "evento", "eventos"],
    [valoresUnicos("cidade").length, "cidade", "cidades"],
    [valoresUnicos("categoria").length, "categoria", "categorias"],
  ].filter(([n]) => n > 0);

  elNumeros.innerHTML = itens
    .map(([n, singular, plur]) => `<div><strong>${n}</strong><span>${n === 1 ? singular : plur}</span></div>`)
    .join("");
  elNumeros.hidden = false;
}

function filtrar() {
  const termo = normalizar(filtros.busca.trim());

  return todos.filter((e) => {
    if (filtros.cidade && e.cidade !== filtros.cidade) return false;
    if (filtros.categoria && e.categoria !== filtros.categoria) return false;
    if (termo && !normalizar(`${e.nome} ${e.localNome ?? ""} ${e.cidade ?? ""}`).includes(termo)) return false;
    return true;
  });
}

function htmlCard(e) {
  const data = dataValida(e.dataInicio);
  const tom = Number(e.id) % 6;

  const capa = e.imagem
    ? `<img src="${escapar(e.imagem)}" alt="" loading="lazy">`
    : `<span class="ev-inicial">${escapar(e.nome.charAt(0).toUpperCase())}</span>`;

  const selo = data
    ? `<span class="ev-data">
         <strong>${String(data.getDate()).padStart(2, "0")}</strong>
         <small>${escapar(data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""))}</small>
       </span>`
    : "";

  const tag = e.categoria ? `<span class="ev-tag">${escapar(e.categoria)}</span>` : "";

  const horario = data
    ? `<p class="ev-linha">${ICONE_RELOGIO}<span>${escapar(formatoDiaHora.format(data))}</span></p>`
    : "";

  const local = [e.localNome, e.cidade].filter(Boolean).join(" · ");
  const linhaLocal = local ? `<p class="ev-linha">${ICONE_LOCAL}<span>${escapar(local)}</span></p>` : "";

  return `
    <li class="ev-card">
      <a href="evento.html?id=${Number(e.id)}">
        <div class="ev-capa tom-${tom}">
          ${capa}
          ${selo}
          ${tag}
        </div>
        <div class="ev-corpo">
          <h3>${escapar(e.nome)}</h3>
          ${horario}
          ${linhaLocal}
        </div>
      </a>
    </li>`;
}

function mostrar() {
  const visiveis = filtrar();
  elAcoes.innerHTML = "";

  if (todos.length === 0) {
    elStatus.textContent = "Ainda não há eventos cadastrados.";
    elAcoes.innerHTML = `<a class="acao-status" href="criar-evento.html">Criar o primeiro evento</a>`;
    elLista.innerHTML = "";
    return;
  }

  if (visiveis.length === 0) {
    elStatus.textContent = "Nenhum evento encontrado com esses filtros.";
    if (temFiltro()) {
      elAcoes.innerHTML = `<button class="acao-status" type="button" data-acao="limpar">Limpar filtros</button>`;
    }
    elLista.innerHTML = "";
    return;
  }

  elStatus.textContent = plural(visiveis.length, "evento encontrado", "eventos encontrados");
  elLista.innerHTML = visiveis.map(htmlCard).join("");
}

function marcarChip(categoria) {
  elCategorias.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("ativo", chip.dataset.categoria === categoria);
  });
}

function limparFiltros() {
  filtros.cidade = "";
  filtros.categoria = "";
  filtros.busca = "";
   montarCidades();
  elBusca.value = "";
  marcarChip("");
  mostrar();
}

async function carregar() {
  elStatus.textContent = "Carregando eventos...";
  elAcoes.innerHTML = "";
  elLista.innerHTML = "";

  try {
    const eventos = await listarEventos();
    todos = [...eventos].sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));
    preencherFiltros();
    mostrarNumeros();
    montarCarrossel(elCarrossel, todos);
    mostrar();
  } catch (erro) {
    console.error(erro);
    elStatus.textContent = "Não foi possível carregar os eventos. A API está rodando?";
    elAcoes.innerHTML = `<button class="acao-status" type="button" data-acao="recarregar">Tentar de novo</button>`;
  }
}

// Eventos da tela
function fecharCidades() {
  elCidadeLista.hidden = true;
  elCidadeBotao.setAttribute("aria-expanded", "false");
}

elCidadeBotao.addEventListener("click", () => {
  const abrir = elCidadeLista.hidden;
  elCidadeLista.hidden = !abrir;
  elCidadeBotao.setAttribute("aria-expanded", String(abrir));
});

elCidadeLista.addEventListener("click", (evento) => {
  const opcao = evento.target.closest("[data-cidade]");
  if (!opcao) return;

  filtros.cidade = opcao.dataset.cidade;
  montarCidades();
  fecharCidades();
  mostrar();
});

document.addEventListener("click", (evento) => {
  if (!elCidade.contains(evento.target)) fecharCidades();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") fecharCidades();
});

elCategorias.addEventListener("click", (evento) => {
  const chip = evento.target.closest(".chip");
  if (!chip) return;

  filtros.categoria = chip.dataset.categoria;
  marcarChip(filtros.categoria);
  mostrar();
});

elBusca.addEventListener("input", () => {
  filtros.busca = elBusca.value;
  mostrar();
});

elAcoes.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "limpar") limparFiltros();
  if (botao.dataset.acao === "recarregar") carregar();
});

carregar();
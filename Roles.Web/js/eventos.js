import { listarEventos, listarIngressos } from "./api.js";
import { escapar, formatarMoeda } from "./util.js";
import { montarCarrossel } from "./carrossel.js";

const elCategorias = document.getElementById("filtro-categorias");
const elBusca = document.getElementById("busca");
const elStatus = document.getElementById("status");
const elAcoes = document.getElementById("acoes");
const elLista = document.getElementById("lista");
const elNumeros = document.getElementById("numeros");
const elCarrossel = document.getElementById("carrossel");
const elAtalhos = document.getElementById("atalhos");

// Seletores de cidade: o da busca (topo) e o dos filtros. Os dois mexem no mesmo filtro.
const controlesCidade = [
  ["cidade", "cidade-botao", "cidade-texto", "cidade-lista"],
  ["hero-cidade", "hero-cidade-botao", "hero-cidade-texto", "hero-cidade-lista"],
]
  .map(([raiz, botao, texto, lista]) => ({
    raiz: document.getElementById(raiz),
    botao: document.getElementById(botao),
    texto: document.getElementById(texto),
    lista: document.getElementById(lista),
  }))
  .filter((c) => c.raiz && c.botao && c.texto && c.lista);

// Quantos cards aparecem. A home define data-limite="8" na lista; a página de eventos não define e mostra todos.
const LIMITE = Number(elLista.dataset.limite) || Infinity;

// Todos os eventos ficam em memória: os filtros trabalham em cima desta lista.
let todos = [];
const filtros = { cidade: "", categoria: "", busca: "", periodo: "", gratuitos: false };

// Resumo de preço por evento (id -> { gratuito, texto } ou null quando não há ingressos).
const precos = {};

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

// Dias entre hoje e a data (0 = hoje, 1 = amanhã, negativo = já passou).
function diasAte(data) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo - base) / 86400000);
}

function textoPrazo(data) {
  if (!data) return "";
  const n = diasAte(data);
  if (n < 0) return "";
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  return `Em ${n} dias`;
}

// Sábado ou domingo dentro dos próximos 7 dias.
function ehFimDeSemana(data) {
  const n = diasAte(data);
  const dia = data.getDay();
  return n >= 0 && n <= 6 && (dia === 0 || dia === 6);
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
  return Boolean(
    filtros.cidade || filtros.categoria || filtros.busca.trim() || filtros.periodo || filtros.gratuitos
  );
}

// ---------- Preços ----------

function resumirPreco(ingressos) {
  if (!Array.isArray(ingressos) || ingressos.length === 0) return null;

  const pagos = ingressos.filter((i) => i.tipo !== "gratuito" && Number(i.valor) > 0);
  if (pagos.length === 0) return { gratuito: true, texto: "Gratuito" };

  const menor = Math.min(...pagos.map((i) => Number(i.valor)));
  return { gratuito: false, texto: `A partir de ${formatarMoeda(menor)}` };
}

async function buscarPreco(id) {
  if (id in precos) return;

  try {
    precos[id] = resumirPreco(await listarIngressos(id));
  } catch (erro) {
    console.error(erro);
    precos[id] = null;
  }
}

function aplicarPreco(id) {
  const el = elLista.querySelector(`[data-preco="${Number(id)}"]`);
  const preco = precos[id];
  if (!el || !preco) return;

  el.textContent = preco.texto;
  el.classList.toggle("gratis", preco.gratuito);
}

async function preencherPrecos(lista) {
  await Promise.all(lista.map((e) => buscarPreco(e.id)));
  lista.forEach((e) => aplicarPreco(e.id));
}

// ---------- Cidade ----------

function montarCidades() {
  const itens = ["", ...valoresUnicos("cidade")];
  const html = itens
    .map((c) => {
      const ativo = c === filtros.cidade;
      return `<li role="option" class="cidade-op${ativo ? " ativo" : ""}" data-cidade="${escapar(c)}" aria-selected="${ativo}">${c ? escapar(c) : "Todas as cidades"}</li>`;
    })
    .join("");

  controlesCidade.forEach((c) => {
    c.lista.innerHTML = html;
    c.texto.textContent = filtros.cidade || "Todas as cidades";
  });
}

function fecharCidades(exceto = null) {
  controlesCidade.forEach((c) => {
    if (c === exceto) return;
    c.lista.hidden = true;
    c.botao.setAttribute("aria-expanded", "false");
  });
}

// ---------- Filtros e atalhos ----------

function preencherFiltros() {
  filtros.cidade = "";
  filtros.categoria = "";
  filtros.busca = "";
  filtros.periodo = "";
  filtros.gratuitos = false;
  elBusca.value = "";

  montarCidades();

  const categorias = valoresUnicos("categoria")
    .map((c) => `<button type="button" class="chip" data-categoria="${escapar(c)}">${escapar(c)}</button>`)
    .join("");
  elCategorias.innerHTML = `<button type="button" class="chip ativo" data-categoria="">Todos</button>${categorias}`;
}

// "Mais buscados": as 2 categorias com mais eventos, mais dois atalhos fixos.
function montarAtalhos() {
  if (!elAtalhos) return;

  if (todos.length === 0) {
    elAtalhos.hidden = true;
    return;
  }

  const contagem = {};
  todos.forEach((e) => {
    if (e.categoria) contagem[e.categoria] = (contagem[e.categoria] ?? 0) + 1;
  });

  const principais = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 2)
    .map(([categoria]) => categoria);

  const itens = [
    ...principais.map((c) => ({ tipo: "categoria", valor: c, rotulo: c })),
    { tipo: "fim", valor: "", rotulo: "Neste fim de semana" },
    { tipo: "gratuitos", valor: "", rotulo: "Gratuitos" },
  ];

  elAtalhos.innerHTML =
    `<span class="atalhos-rotulo">Mais buscados:</span>` +
    itens
      .map(
        (i) =>
          `<button type="button" class="atalho" data-tipo="${i.tipo}" data-valor="${escapar(i.valor)}">${escapar(i.rotulo)}</button>`
      )
      .join("");
  elAtalhos.hidden = false;
}

// Números do topo da página, calculados com os eventos reais (só existem na home).
function mostrarNumeros() {
  if (!elNumeros) return;

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

    if (filtros.periodo === "fim") {
      const data = dataValida(e.dataInicio);
      if (!data || !ehFimDeSemana(data)) return false;
    }

    if (filtros.gratuitos && !precos[e.id]?.gratuito) return false;

    return true;
  });
}

// ---------- Cards ----------

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

  const prazo = textoPrazo(data);
  const linhaPrazo = prazo ? `<p class="ev-prazo">${escapar(prazo)}</p>` : "";

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
          ${linhaPrazo}
          <p class="ev-preco" data-preco="${Number(e.id)}"></p>
        </div>
      </a>
    </li>`;
}

// Botões dos filtros que não têm aba própria (fim de semana e gratuitos), para dar para tirar.
function htmlFiltrosExtras() {
  const itens = [];

  if (filtros.periodo === "fim") {
    itens.push(`<button class="acao-status" type="button" data-acao="tirar-periodo">Neste fim de semana ×</button>`);
  }
  if (filtros.gratuitos) {
    itens.push(`<button class="acao-status" type="button" data-acao="tirar-gratuitos">Gratuitos ×</button>`);
  }

  return itens.join("");
}

function mostrar() {
  const visiveis = filtrar();
  elAcoes.innerHTML = htmlFiltrosExtras();

  if (todos.length === 0) {
    elStatus.textContent = "Ainda não há eventos cadastrados.";
    elAcoes.innerHTML = `<a class="acao-status" href="criar-evento.html">Criar o primeiro evento</a>`;
    elLista.innerHTML = "";
    return;
  }

  if (visiveis.length === 0) {
    elStatus.textContent = "Nenhum evento encontrado com esses filtros.";
    if (temFiltro()) {
      elAcoes.innerHTML += `<button class="acao-status" type="button" data-acao="limpar">Limpar filtros</button>`;
    }
    elLista.innerHTML = "";
    return;
  }

  const exibidos = visiveis.slice(0, LIMITE);

  elStatus.textContent =
    exibidos.length < visiveis.length
      ? `Mostrando ${exibidos.length} de ${visiveis.length} eventos`
      : plural(visiveis.length, "evento encontrado", "eventos encontrados");

  elLista.innerHTML = exibidos.map(htmlCard).join("");

  // O preço vem de uma segunda chamada: o card aparece primeiro e a linha de preço entra depois.
  exibidos.forEach((e) => aplicarPreco(e.id));
  preencherPrecos(exibidos);
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
  filtros.periodo = "";
  filtros.gratuitos = false;
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
    montarAtalhos();
    if (elCarrossel) montarCarrossel(elCarrossel, todos);
    mostrar();
  } catch (erro) {
    console.error(erro);
    elStatus.textContent = "Não foi possível carregar os eventos. A API está rodando?";
    elAcoes.innerHTML = `<button class="acao-status" type="button" data-acao="recarregar">Tentar de novo</button>`;
  }
}

// ---------- Eventos da tela ----------

controlesCidade.forEach((controle) => {
  controle.botao.addEventListener("click", () => {
    const abrir = controle.lista.hidden;
    fecharCidades(controle);
    controle.lista.hidden = !abrir;
    controle.botao.setAttribute("aria-expanded", String(abrir));
  });

  controle.lista.addEventListener("click", (evento) => {
    const opcao = evento.target.closest("[data-cidade]");
    if (!opcao) return;

    filtros.cidade = opcao.dataset.cidade;
    montarCidades();
    fecharCidades();
    mostrar();
  });
});

document.addEventListener("click", (evento) => {
  if (!controlesCidade.some((c) => c.raiz.contains(evento.target))) fecharCidades();
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

if (elAtalhos) {
  elAtalhos.addEventListener("click", async (evento) => {
    const atalho = evento.target.closest(".atalho");
    if (!atalho) return;

    // Cada atalho substitui os outros; cidade e busca continuam valendo.
    filtros.categoria = "";
    filtros.periodo = "";
    filtros.gratuitos = false;

    const { tipo, valor } = atalho.dataset;
    if (tipo === "categoria") filtros.categoria = valor;
    if (tipo === "fim") filtros.periodo = "fim";
    if (tipo === "gratuitos") {
      filtros.gratuitos = true;
      elStatus.textContent = "Carregando preços...";
      await preencherPrecos(todos);
    }

    marcarChip(filtros.categoria);
    mostrar();
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
  });
}

elAcoes.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;

  const acao = botao.dataset.acao;
  if (acao === "limpar") limparFiltros();
  if (acao === "recarregar") carregar();
  if (acao === "tirar-periodo") {
    filtros.periodo = "";
    mostrar();
  }
  if (acao === "tirar-gratuitos") {
    filtros.gratuitos = false;
    mostrar();
  }
});

carregar();
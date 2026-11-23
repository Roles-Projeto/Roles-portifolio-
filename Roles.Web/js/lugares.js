import { listarLugares } from "./api.js";
import { escapar } from "./util.js";
import { situacao } from "./horarios.js";

const elBusca = document.getElementById("busca");
const elStatus = document.getElementById("status");
const elTipos = document.getElementById("filtro-tipos");
const elAcoes = document.getElementById("acoes");
const elLista = document.getElementById("lista");

const elCidade = document.getElementById("cidade");
const elCidadeBotao = document.getElementById("cidade-botao");
const elCidadeTexto = document.getElementById("cidade-texto");
const elCidadeLista = document.getElementById("cidade-lista");

// Todos os lugares ficam em memória: os filtros trabalham em cima desta lista.
let todos = [];
const filtros = { cidade: "", tipo: "", busca: "" };

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

// Tira acentos e maiúsculas para a busca achar "cafe" em "Café".
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function valoresUnicos(campo) {
  const valores = todos.map((l) => l[campo]).filter(Boolean);
  return [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function temFiltro() {
  return Boolean(filtros.cidade || filtros.tipo || filtros.busca.trim());
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

function montarTipos() {
  const abas = valoresUnicos("tipo")
    .map((t) => `<button type="button" class="lg-aba" data-tipo="${escapar(t)}">${escapar(t)}</button>`)
    .join("");
  elTipos.innerHTML = `<button type="button" class="lg-aba ativo" data-tipo="">Todos</button>${abas}`;
}

function marcarAba(tipo) {
  elTipos.querySelectorAll(".lg-aba").forEach((aba) => {
    aba.classList.toggle("ativo", aba.dataset.tipo === tipo);
  });
}

function filtrar() {
  const termo = normalizar(filtros.busca.trim());

  return todos.filter((l) => {
    if (filtros.cidade && l.cidade !== filtros.cidade) return false;
    if (filtros.tipo && l.tipo !== filtros.tipo) return false;
    if (termo && !normalizar(`${l.nome} ${l.tipo} ${l.bairro ?? ""} ${l.cidade ?? ""}`).includes(termo)) return false;
    return true;
  });
}

function htmlCard(l) {
  const tom = Number(l.id) % 6;

  const capa = l.imagem
    ? `<img src="${escapar(l.imagem)}" alt="" loading="lazy">`
    : `<span class="lg-inicial">${escapar(l.nome.charAt(0).toUpperCase())}</span>`;

  const faixa = Math.min(3, Math.max(0, Number(l.faixaPreco) || 0));
  const preco = faixa ? `<span class="lg-preco">${"$".repeat(faixa)}</span>` : "";

  const local = [l.bairro, l.cidade].filter(Boolean).join(" · ");
  const linhaLocal = local ? `<p class="lg-local">${escapar(local)}</p>` : "";

  const situ = situacao(l.horarios);
  const linhaSituacao = situ
    ? `<p class="lg-sit ${situ.aberto ? "aberto" : "fechado"}">${escapar(situ.texto)}</p>`
    : "";

  return `
    <li class="lg-card">
      <a href="lugar.html?id=${Number(l.id)}">
        <div class="lg-capa tom-${tom}">
          ${capa}
          ${preco}
          <span class="lg-tag">${escapar(l.tipo)}</span>
        </div>
        <div class="lg-corpo">
          <h3>${escapar(l.nome)}</h3>
          ${linhaLocal}
          ${linhaSituacao}
        </div>
      </a>
    </li>`;
}

function mostrar() {
  const visiveis = filtrar();
  elAcoes.innerHTML = "";

  if (todos.length === 0) {
    elStatus.textContent = "Ainda não há lugares cadastrados.";
    elAcoes.innerHTML = `<a class="lg-acao" href="index.html">Voltar para os eventos</a>`;
    elLista.innerHTML = "";
    return;
  }

  if (visiveis.length === 0) {
    elStatus.textContent = "Nenhum lugar encontrado com esses filtros.";
    if (temFiltro()) {
      elAcoes.innerHTML = `<button class="lg-acao" type="button" data-acao="limpar">Limpar filtros</button>`;
    }
    elLista.innerHTML = "";
    return;
  }

  elStatus.textContent = plural(visiveis.length, "lugar encontrado", "lugares encontrados");
  elLista.innerHTML = visiveis.map(htmlCard).join("");
}

function limparFiltros() {
  filtros.cidade = "";
  filtros.tipo = "";
  filtros.busca = "";
  elBusca.value = "";
  marcarAba("");
  montarCidades();
  mostrar();
}

async function carregar() {
  elStatus.textContent = "Carregando lugares...";
  elAcoes.innerHTML = "";
  elLista.innerHTML = "";

  try {
    todos = await listarLugares();
    filtros.cidade = "";
    filtros.tipo = "";
    filtros.busca = "";
    elBusca.value = "";
    montarTipos();
    montarCidades();
    mostrar();
  } catch (erro) {
    console.error(erro);
    elStatus.textContent = "Não foi possível carregar os lugares. A API está rodando?";
    elAcoes.innerHTML = `<button class="lg-acao" type="button" data-acao="recarregar">Tentar de novo</button>`;
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

elTipos.addEventListener("click", (evento) => {
  const aba = evento.target.closest(".lg-aba");
  if (!aba) return;

  filtros.tipo = aba.dataset.tipo;
  marcarAba(filtros.tipo);
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
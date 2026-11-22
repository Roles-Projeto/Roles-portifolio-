import { listarEventos } from "./api.js";
import { escapar, formatarData } from "./util.js";

const elStatus = document.getElementById("status");
const elLista = document.getElementById("lista");
const elCidade = document.getElementById("filtro-cidade");
const elCategorias = document.getElementById("filtro-categorias");

let categoriaAtiva = "";

function criarCard(evento) {
  const capa = evento.imagem
    ? `<img src="${escapar(evento.imagem)}" alt="" loading="lazy">`
    : `<span class="capa-inicial">${escapar(evento.nome.charAt(0))}</span>`;

  const local = [evento.localNome, evento.cidade].filter(Boolean).join(", ");

  return `
    <li class="card">
      <a href="evento.html?id=${evento.id}">
        <div class="capa">${capa}</div>
        <p class="meta">${escapar(formatarData(evento.dataInicio))} · ${escapar(evento.categoria ?? "Evento")}</p>
        <h3>${escapar(evento.nome)}</h3>
        <p class="local">${escapar(local)}</p>
      </a>
    </li>`;
}

function renderizar(eventos) {
  if (eventos.length === 0) {
    elStatus.textContent = "Nenhum evento encontrado com esses filtros.";
    elLista.innerHTML = "";
    return;
  }

  elStatus.textContent = `${eventos.length} evento(s)`;
  elLista.innerHTML = eventos.map(criarCard).join("");
}

// Monta as opções de cidade e os botões de categoria a partir dos eventos existentes.
function preencherFiltros(eventos) {
  const cidades = [...new Set(eventos.map((e) => e.cidade).filter(Boolean))].sort();
  for (const cidade of cidades) {
    const opcao = document.createElement("option");
    opcao.value = cidade;
    opcao.textContent = cidade;
    elCidade.appendChild(opcao);
  }

  const categorias = [...new Set(eventos.map((e) => e.categoria).filter(Boolean))].sort();
  for (const categoria of categorias) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "chip";
    botao.dataset.categoria = categoria;
    botao.textContent = categoria;
    elCategorias.appendChild(botao);
  }
}

async function carregar() {
  elStatus.textContent = "Carregando eventos...";

  try {
    const eventos = await listarEventos({
      cidade: elCidade.value,
      categoria: categoriaAtiva,
    });
    renderizar(eventos);
  } catch (erro) {
    elStatus.textContent = "Não foi possível carregar os eventos. A API está rodando?";
    console.error(erro);
  }
}

elCidade.addEventListener("change", carregar);

elCategorias.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".chip");
  if (!botao) return;

  categoriaAtiva = botao.dataset.categoria;

  for (const chip of elCategorias.querySelectorAll(".chip")) {
    chip.classList.toggle("ativo", chip === botao);
  }

  carregar();
});

async function iniciar() {
  try {
    const todos = await listarEventos();
    preencherFiltros(todos);
    renderizar(todos);
  } catch (erro) {
    elStatus.textContent = "Não foi possível carregar os eventos. A API está rodando?";
    console.error(erro);
  }
}

iniciar();
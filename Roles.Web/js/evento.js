import { buscarEvento, listarIngressos } from "./api.js";
import { escapar, formatarDataCompleta, formatarMoeda } from "./util.js";

const elStatus = document.getElementById("status");
const elTopo = document.getElementById("topo");
const elCorpo = document.getElementById("corpo");

// Lê o ?id=3 do endereço da página.
const id = Number(new URLSearchParams(window.location.search).get("id"));

const ICONE_RELOGIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const ICONE_LOCAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

function dataValida(iso) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

// A categoria pode vir como texto ou como objeto com "nome".
function textoCategoria(categoria) {
  if (!categoria) return "";
  if (typeof categoria === "string") return categoria.trim();
  return String(categoria.nome ?? "").trim();
}

function htmlIngressos(ingressos) {
  if (ingressos.length === 0) {
    return `<p class="suave">Os ingressos ainda não foram cadastrados.</p>`;
  }

  const itens = ingressos
    .map((i) => {
      const preco = i.tipo === "gratuito" ? "Gratuito" : formatarMoeda(i.valor);
      const qtd = Number(i.quantidadeTotal);
      return `
        <li class="ingresso">
          <span class="ingresso-nome">${escapar(i.titulo)}</span>
          <span class="ingresso-qtd">${escapar(qtd)} ${qtd === 1 ? "ingresso" : "ingressos"}</span>
          <span class="preco">${escapar(preco)}</span>
          <button type="button" class="comprar">Comprar</button>
        </li>`;
    })
    .join("");

  return `<ul class="ingressos">${itens}</ul>
    <p class="aviso" id="aviso" hidden>A compra de ingressos ainda está em desenvolvimento.</p>`;
}

function renderizar(e) {
  document.title = `${e.nome} · Rolês`;

  const data = dataValida(e.dataInicio);
  const tom = Number(e.id ?? id) % 6;

  const fundo = e.imagem
    ? `<img src="${escapar(e.imagem)}" alt="">`
    : `<span class="det-inicial">${escapar(e.nome.charAt(0).toUpperCase())}</span>`;

  const selo = data
    ? `<span class="det-data">
         <strong>${String(data.getDate()).padStart(2, "0")}</strong>
         <small>${escapar(data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""))}</small>
       </span>`
    : "";

  const categoria = textoCategoria(e.categoria);
  const etiqueta = categoria ? `<span class="det-etiqueta">${escapar(categoria)}</span>` : "";

  const quando = data
    ? `<p class="det-linha">${ICONE_RELOGIO}<span>${escapar(formatarDataCompleta(e.dataInicio))}${
        e.dataFim ? `<small>Termina em ${escapar(formatarDataCompleta(e.dataFim))}</small>` : ""
      }</span></p>`
    : "";

  const cidadeEstado = [e.cidade, e.estado].filter(Boolean).join("/");
  const resumoLocal = [e.localNome, cidadeEstado].filter(Boolean).join(" · ");
  const onde = resumoLocal
    ? `<p class="det-linha">${ICONE_LOCAL}<span>${escapar(resumoLocal)}</span></p>`
    : "";

  const endereco = [e.rua, e.cep, cidadeEstado].filter(Boolean).join(" · ");

  elTopo.innerHTML = `
    <div class="det-topo">
      <div class="det-info">
        ${etiqueta}
        <h1>${escapar(e.nome)}</h1>
        ${quando}
        ${onde}
        <a class="det-botao" href="#ingressos">Ver ingressos</a>
      </div>

      <div class="det-capa tom-${tom}">
        ${fundo}
        ${selo}
      </div>
    </div>`;

  elCorpo.innerHTML = `
    <section class="det-ingressos" id="ingressos">
      <h2>Ingressos</h2>
      <div id="lista-ingressos"><p class="suave">Carregando ingressos...</p></div>
    </section>

    <div class="det-baixo">
      <section>
        <h2>Sobre o evento</h2>
        <p class="descricao">${escapar(e.descricao ?? "Este evento ainda não tem descrição.")}</p>
      </section>

      <section>
        <h2>Local</h2>
                <p><strong>${
          e.lugarId
            ? `<a class="link-lugar" href="lugar.html?id=${Number(e.lugarId)}">${escapar(e.localNome ?? "Ver o lugar")}</a>`
            : escapar(e.localNome ?? "A definir")
        }</strong></p>
        <p class="suave">${escapar(endereco)}</p>
      </section>
    </div>

    <p class="organizador">Organizado por ${escapar(e.nomeProdutor ?? "organizador não informado")}</p>`;
}

// Os ingressos vêm em uma segunda chamada: se falharem, o evento continua na tela.
async function carregarIngressos() {
  const elLista = document.getElementById("lista-ingressos");

  try {
    const ingressos = await listarIngressos(id);
    elLista.innerHTML = htmlIngressos(ingressos);

    elLista.addEventListener("click", (evento) => {
      if (!evento.target.closest(".comprar")) return;
      const aviso = document.getElementById("aviso");
      if (aviso) aviso.hidden = false;
    });
  } catch (erro) {
    elLista.innerHTML = `<p class="suave">Não foi possível carregar os ingressos.</p>`;
    console.error(erro);
  }
}

async function iniciar() {
  if (!Number.isInteger(id) || id <= 0) {
    elStatus.textContent = "Evento não encontrado.";
    return;
  }

  try {
    const evento = await buscarEvento(id);
    elStatus.hidden = true;
    renderizar(evento);
    carregarIngressos();
  } catch (erro) {
    elStatus.textContent =
      erro.status === 404
        ? "Evento não encontrado."
        : "Não foi possível carregar o evento. A API está rodando?";
    console.error(erro);
  }
}

iniciar();
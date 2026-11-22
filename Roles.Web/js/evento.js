import { buscarEvento } from "./api.js";
import { escapar, formatarDataCompleta } from "./util.js";

const elStatus = document.getElementById("status");
const elEvento = document.getElementById("evento");

// Lê o ?id=3 do endereço da página.
const id = Number(new URLSearchParams(window.location.search).get("id"));

function renderizar(e) {
  document.title = `${e.nome} · Rolês`;

  const capa = e.imagem
    ? `<img src="${escapar(e.imagem)}" alt="">`
    : `<span class="capa-inicial">${escapar(e.nome.charAt(0))}</span>`;

  const endereco = [e.rua, e.cep, [e.cidade, e.estado].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" · ");

  const fim = e.dataFim
    ? `<p class="termino">Termina em ${escapar(formatarDataCompleta(e.dataFim))}</p>`
    : "";

  elEvento.innerHTML = `
    <div class="detalhe">
      <div class="capa">${capa}</div>

      <div class="info">
        <p class="selo">${escapar(e.categoria ?? "Evento")}</p>
        <h1>${escapar(e.nome)}</h1>
        <p class="data">${escapar(formatarDataCompleta(e.dataInicio))}</p>
        ${fim}

        <div class="bloco">
          <h2>Local</h2>
          <p><strong>${escapar(e.localNome ?? "A definir")}</strong></p>
          <p class="suave">${escapar(endereco)}</p>
        </div>

        <div class="bloco">
          <h2>Sobre o evento</h2>
          <p class="descricao">${escapar(e.descricao ?? "Este evento ainda não tem descrição.")}</p>
        </div>

        <p class="suave">Organizado por ${escapar(e.nomeProdutor ?? "organizador não informado")}</p>
      </div>
    </div>`;
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
  } catch (erro) {
    elStatus.textContent =
      erro.status === 404
        ? "Evento não encontrado."
        : "Não foi possível carregar o evento. A API está rodando?";
    console.error(erro);
  }
}

iniciar();
import { listarMeusLugares, apagarLugar } from "./api.js";
import { estaLogada } from "./auth.js";
import { escapar } from "./util.js";
import { situacao } from "./horarios.js";

if (!estaLogada()) {
  window.location.replace("login.html?voltar=meus-lugares.html");
}

const elStatus = document.getElementById("status");
const elAcoes = document.getElementById("acoes");
const elLista = document.getElementById("lista");

let lugares = [];

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
      <div class="ml-acoes">
        <a class="ml-btn" href="criar-lugar.html?id=${Number(l.id)}">Editar</a>
        <button class="ml-btn perigo" type="button" data-apagar="${Number(l.id)}">Apagar</button>
      </div>
    </li>`;
}

function mostrar() {
  elAcoes.innerHTML = "";

  if (lugares.length === 0) {
    elStatus.textContent = "Você ainda não cadastrou nenhum lugar.";
    elAcoes.innerHTML = `<a class="lg-acao" href="criar-lugar.html">Cadastrar meu primeiro lugar</a>`;
    elLista.innerHTML = "";
    return;
  }

  elStatus.textContent = `${lugares.length} ${lugares.length === 1 ? "lugar cadastrado" : "lugares cadastrados"}`;
  elLista.innerHTML = lugares.map(htmlCard).join("");
}

async function carregar() {
  try {
    lugares = await listarMeusLugares();
    mostrar();
  } catch (erro) {
    console.error(erro);
    if (erro.sessaoExpirada) {
      window.location.replace("login.html?voltar=meus-lugares.html");
      return;
    }
    elStatus.textContent = "Não foi possível carregar seus lugares. A API está rodando?";
    elAcoes.innerHTML = `<button class="lg-acao" type="button" data-acao="recarregar">Tentar de novo</button>`;
  }
}

elLista.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("[data-apagar]");
  if (!botao) return;

  const id = Number(botao.dataset.apagar);
  const lugar = lugares.find((l) => l.id === id);
  if (!window.confirm(`Apagar "${lugar?.nome ?? "este lugar"}"? Essa ação não pode ser desfeita.`)) return;

  botao.disabled = true;
  botao.textContent = "Apagando...";

  try {
    await apagarLugar(id);
    lugares = lugares.filter((l) => l.id !== id);
    mostrar();
  } catch (erro) {
    console.error(erro);
    window.alert(erro.detalhes?.[0] ?? "Não foi possível apagar o lugar.");
    botao.disabled = false;
    botao.textContent = "Apagar";
  }
});

elAcoes.addEventListener("click", (evento) => {
  if (evento.target.closest('[data-acao="recarregar"]')) carregar();
});

if (estaLogada()) carregar();
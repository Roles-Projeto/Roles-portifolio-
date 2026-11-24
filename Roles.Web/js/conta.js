import { listarEventos, listarMeusLugares, apagarEvento, apagarLugar } from "./api.js";
import { estaLogada, lerUsuario, lerToken, limparSessao } from "./auth.js";
import { escapar } from "./util.js";

if (!estaLogada()) {
  window.location.replace("login.html?voltar=conta.html");
}

const SECOES = ["ingressos", "eventos", "lugares", "dados"];
const SECAO_PADRAO = "eventos";

const elResumo = document.getElementById("resumo");
const elResumoLugares = document.getElementById("resumo-lugares");
const elStatusEventos = document.getElementById("status-eventos");
const elStatusLugares = document.getElementById("status-lugares");
const elListaEventos = document.getElementById("lista-eventos");
const elListaLugares = document.getElementById("lista-lugares");

let meusEventos = [];
let meusLugares = [];

// ---------- Dados da pessoa logada ----------

// Lê o que a sessão guardou; se faltar algo, tenta pelo próprio token.
function lerDadosDoToken() {
  try {
    const parte = lerToken().split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(parte));
  } catch {
    return {};
  }
}

function dadosDaSessao() {
  const usuario = lerUsuario() ?? {};
  const token = lerDadosDoToken();

  const id = Number(
    usuario.id ??
      usuario.usuarioId ??
      token.sub ??
      token.nameid ??
      token["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      token.id
  );

  return {
    id: Number.isFinite(id) ? id : null,
    nome: String(usuario.nome ?? token.name ?? token.unique_name ?? "Conta"),
    email: String(usuario.email ?? token.email ?? ""),
  };
}

const eu = dadosDaSessao();

document.getElementById("cc-avatar").textContent = eu.nome.charAt(0).toUpperCase();
document.getElementById("cc-nome").textContent = eu.nome;
document.getElementById("cc-email").textContent = eu.email;
document.getElementById("dado-nome").textContent = eu.nome;
document.getElementById("dado-email").textContent = eu.email || "Não informado";

// ---------- Seções ----------

function mostrarSecao(nome) {
  const secao = SECOES.includes(nome) ? nome : SECAO_PADRAO;

  for (const s of SECOES) {
    document.getElementById(`sec-${s}`).hidden = s !== secao;
  }

  for (const link of document.querySelectorAll("[data-secao]")) {
    if (link.dataset.secao === secao) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
}

window.addEventListener("hashchange", () => mostrarSecao(window.location.hash.slice(1)));
mostrarSecao(window.location.hash.slice(1));

// ---------- Montagem das linhas ----------

function blocoDeData(valor) {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return { dia: "-", mes: "" };

  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
  return { dia: String(d.getDate()), mes };
}

function dataCompleta(valor) {
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function htmlEvento(e) {
  const nome = e.nome ?? e.titulo ?? "Evento sem nome";
  const { dia, mes } = blocoDeData(e.dataInicio);
  const detalhes = [e.cidade, dataCompleta(e.dataInicio)].filter(Boolean).join(", ");

  return `
    <li class="cc-linha">
      <div class="cc-data"><b>${escapar(dia)}</b><small>${escapar(mes)}</small></div>
      <div class="cc-info">
        <h3><a href="evento.html?id=${Number(e.id)}">${escapar(nome)}</a></h3>
        <p>${escapar(detalhes)}</p>
      </div>
      <div class="cc-botoes">
        <a href="evento.html?id=${Number(e.id)}">Ver</a>
        <a href="cadastrar.html?tipo=evento&id=${Number(e.id)}">Editar</a>
        <button type="button" data-apagar-evento="${Number(e.id)}">Apagar</button>
      </div>
    </li>`;
}

function htmlLugar(l) {
  const local = [l.bairro, l.cidade].filter(Boolean).join(", ");
  const detalhes = [l.tipo, local].filter(Boolean).join(". ");

  return `
    <li class="cc-linha">
      <div class="cc-data"><b>${escapar(String(l.nome ?? "?").charAt(0).toUpperCase())}</b></div>
      <div class="cc-info">
        <h3><a href="lugar.html?id=${Number(l.id)}">${escapar(l.nome)}</a></h3>
        <p>${escapar(detalhes)}</p>
      </div>
      <div class="cc-botoes">
        <a href="lugar.html?id=${Number(l.id)}">Ver</a>
        <a href="cadastrar.html?tipo=lugar&id=${Number(l.id)}">Editar</a>
        <button type="button" data-apagar-lugar="${Number(l.id)}">Apagar</button>
      </div>
    </li>`;
}

function textoPlural(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function atualizarResumos() {
  const eventos = textoPlural(meusEventos.length, "evento publicado", "eventos publicados");
  const lugares = textoPlural(meusLugares.length, "lugar cadastrado", "lugares cadastrados");
  elResumo.textContent = `Você tem ${eventos} e ${lugares}.`;
  elResumoLugares.textContent = elResumo.textContent;
}

function mostrarEventos() {
  atualizarResumos();

  if (meusEventos.length === 0) {
    elStatusEventos.hidden = false;
    elStatusEventos.innerHTML = `<p>Você ainda não publicou nenhum evento.</p><p><a class="cc-acao" href="cadastrar.html?tipo=evento">Cadastrar meu primeiro evento</a></p>`;
    elListaEventos.innerHTML = "";
    return;
  }

  elStatusEventos.hidden = true;
  elListaEventos.innerHTML = meusEventos.map(htmlEvento).join("");
}

function mostrarLugares() {
  atualizarResumos();

  if (meusLugares.length === 0) {
    elStatusLugares.hidden = false;
    elStatusLugares.innerHTML = `<p>Você ainda não cadastrou nenhum lugar.</p><p><a class="cc-acao" href="cadastrar.html?tipo=lugar">Cadastrar meu primeiro lugar</a></p>`;
    elListaLugares.innerHTML = "";
    return;
  }

  elStatusLugares.hidden = true;
  elListaLugares.innerHTML = meusLugares.map(htmlLugar).join("");
}

function mostrarErro(elemento, mensagem) {
  elemento.hidden = false;
  elemento.innerHTML = `<p>${escapar(mensagem)}</p><p><button class="cc-acao" type="button" data-recarregar style="padding:0;border:0;background:none;font:inherit;cursor:pointer">Tentar de novo</button></p>`;
}

// ---------- Carregamento ----------

async function carregarEventos() {
  try {
    const todos = await listarEventos();
    // A API devolve todos os eventos; ficam só os da pessoa logada.
    meusEventos = todos
      .filter((e) => eu.id !== null && Number(e.usuarioId) === eu.id)
      .sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));
    mostrarEventos();
  } catch (erro) {
    console.error(erro);
    if (erro.sessaoExpirada) {
      window.location.replace("login.html?voltar=conta.html");
      return;
    }
    elResumo.textContent = "";
    mostrarErro(elStatusEventos, "Não foi possível carregar seus eventos. A API está rodando?");
  }
}

async function carregarLugares() {
  try {
    meusLugares = await listarMeusLugares();
    mostrarLugares();
  } catch (erro) {
    console.error(erro);
    if (erro.sessaoExpirada) {
      window.location.replace("login.html?voltar=conta.html");
      return;
    }
    elResumoLugares.textContent = "";
    mostrarErro(elStatusLugares, "Não foi possível carregar seus lugares. A API está rodando?");
  }
}

async function carregar() {
  await Promise.all([carregarEventos(), carregarLugares()]);
  atualizarResumos();
}

// ---------- Ações ----------

elListaEventos.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("[data-apagar-evento]");
  if (!botao) return;

  const id = Number(botao.dataset.apagarEvento);
  const item = meusEventos.find((e) => e.id === id);
  const nome = item?.nome ?? item?.titulo ?? "este evento";
  if (!window.confirm(`Apagar "${nome}"? Essa ação não pode ser desfeita.`)) return;

  botao.disabled = true;
  botao.textContent = "Apagando...";

  try {
    await apagarEvento(id);
    meusEventos = meusEventos.filter((e) => e.id !== id);
    mostrarEventos();
  } catch (erro) {
    console.error(erro);
    window.alert(erro.detalhes?.[0] ?? "Não foi possível apagar o evento.");
    botao.disabled = false;
    botao.textContent = "Apagar";
  }
});

elListaLugares.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("[data-apagar-lugar]");
  if (!botao) return;

  const id = Number(botao.dataset.apagarLugar);
  const item = meusLugares.find((l) => l.id === id);
  if (!window.confirm(`Apagar "${item?.nome ?? "este lugar"}"? Essa ação não pode ser desfeita.`)) return;

  botao.disabled = true;
  botao.textContent = "Apagando...";

  try {
    await apagarLugar(id);
    meusLugares = meusLugares.filter((l) => l.id !== id);
    mostrarLugares();
  } catch (erro) {
    console.error(erro);
    window.alert(erro.detalhes?.[0] ?? "Não foi possível apagar o lugar.");
    botao.disabled = false;
    botao.textContent = "Apagar";
  }
});

document.addEventListener("click", (evento) => {
  if (evento.target.closest("[data-recarregar]")) carregar();
});

document.getElementById("cc-sair").addEventListener("click", () => {
  limparSessao();
  window.location.href = "index.html";
});

if (estaLogada()) carregar();
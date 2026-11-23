import { lerToken, limparSessao } from "./auth.js";

// Único arquivo que conhece o endereço da API.
// No seu computador usa a API local; no site publicado usa a Render.
const ehLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_URL = ehLocal
  ? "http://localhost:5038/api"
  : "https://roles-portifolio.onrender.com/api";

// Extrai as mensagens de erro que a API manda no corpo da resposta.
async function lerMensagensDeErro(resposta) {
  try {
    const corpo = await resposta.json();
    if (corpo.errors) return Object.values(corpo.errors).flat();
    if (corpo.mensagem) return [corpo.mensagem];
    if (corpo.title) return [corpo.title];
  } catch {
    // resposta sem JSON: segue sem detalhes
  }
  return [];
}

async function pedir(caminho, opcoes = {}) {
  // Se há sessão, o token vai em todo pedido.
  const token = lerToken();
  const headers = { ...(opcoes.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, headers });

  if (!resposta.ok) {
    const erro = new Error(`A API respondeu com erro ${resposta.status}`);
    erro.status = resposta.status;
    erro.detalhes = await lerMensagensDeErro(resposta);

    // Mandamos um token e a API disse 401: ele venceu ou é inválido.
    if (resposta.status === 401 && token) {
      limparSessao();
      erro.sessaoExpirada = true;
    }

    throw erro;
  }

  return resposta.status === 204 ? null : resposta.json();
}

function enviarJson(metodo, dados) {
  return {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  };
}

export function listarEventos({ cidade = "", categoria = "" } = {}) {
  const params = new URLSearchParams();
  if (cidade) params.set("cidade", cidade);
  if (categoria) params.set("categoria", categoria);

  const texto = params.toString();
  return pedir(`/eventos${texto ? `?${texto}` : ""}`);
}

export function buscarEvento(id) {
  return pedir(`/eventos/${id}`);
}

export function criarEvento(dados) {
  return pedir("/eventos", enviarJson("POST", dados));
}

export function atualizarEvento(id, dados) {
  return pedir(`/eventos/${id}`, enviarJson("PUT", dados));
}

export function apagarEvento(id) {
  return pedir(`/eventos/${id}`, { method: "DELETE" });
}

export function listarIngressos(eventoId) {
  return pedir(`/eventos/${eventoId}/ingressos`);
}

export function criarIngresso(eventoId, dados) {
  return pedir(`/eventos/${eventoId}/ingressos`, enviarJson("POST", dados));
}

export function registrar(dados) {
  return pedir("/auth/registro", enviarJson("POST", dados));
}

export function login(dados) {
  return pedir("/auth/login", enviarJson("POST", dados));
}

export function listarLugares({ cidade = "", tipo = "", busca = "" } = {}) {
  const params = new URLSearchParams();
  if (cidade) params.set("cidade", cidade);
  if (tipo) params.set("tipo", tipo);
  if (busca) params.set("busca", busca);

  const texto = params.toString();
  return pedir(`/lugares${texto ? `?${texto}` : ""}`);
}

export function buscarLugar(id) {
  return pedir(`/lugares/${id}`);
}

export function listarEventosDoLugar(id) {
  return pedir(`/lugares/${id}/eventos`);
}

export function criarLugar(dados) {
  return pedir("/lugares", enviarJson("POST", dados));
}

export function atualizarLugar(id, dados) {
  return pedir(`/lugares/${id}`, enviarJson("PUT", dados));
}

export function apagarLugar(id) {
  return pedir(`/lugares/${id}`, { method: "DELETE" });
}

export function atualizarIngresso(eventoId, id, dados) {
  return pedir(`/eventos/${eventoId}/ingressos/${id}`, enviarJson("PUT", dados));
}

export function apagarIngresso(eventoId, id) {
  return pedir(`/eventos/${eventoId}/ingressos/${id}`, { method: "DELETE" });
}

export function listarLugaresDaHome() {
  return pedir("/lugares");
}

export function listarMeusLugares() {
  return pedir("/lugares/meus");
}
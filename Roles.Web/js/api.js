import { lerToken, limparSessao } from "./auth.js";

// Único arquivo que conhece o endereço da API.
const API_URL = "http://localhost:5038/api";

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
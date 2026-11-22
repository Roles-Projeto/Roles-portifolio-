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

async function pedir(caminho, opcoes) {
  const resposta = await fetch(`${API_URL}${caminho}`, opcoes);

  if (!resposta.ok) {
    const erro = new Error(`A API respondeu com erro ${resposta.status}`);
    erro.status = resposta.status;
    erro.detalhes = await lerMensagensDeErro(resposta);
    throw erro;
  }

  return resposta.status === 204 ? null : resposta.json();
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
  return pedir("/eventos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

export function listarIngressos(eventoId) {
  return pedir(`/eventos/${eventoId}/ingressos`);
}
// Único arquivo que conhece o endereço da API.
const API_URL = "http://localhost:5038/api";

async function pedir(caminho) {
  const resposta = await fetch(`${API_URL}${caminho}`);

  if (!resposta.ok) {
    const erro = new Error(`A API respondeu com erro ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }

  return resposta.json();
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
import { criarEvento } from "./api.js";
import { escapar } from "./util.js";

const form = document.getElementById("form-evento");
const elErros = document.getElementById("erros");
const botao = document.getElementById("botao-salvar");

// Texto em branco vira null (a API entende como "não informado").
function textoOuNulo(valor) {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

// O campo datetime-local entrega "2027-01-15T19:00"; a API espera os segundos.
function dataParaApi(valor) {
  return valor ? `${valor}:00` : null;
}

function lerFormulario() {
  const campos = new FormData(form);

  return {
    nome: String(campos.get("nome")).trim(),
    assunto: textoOuNulo(campos.get("assunto")),
    categoria: textoOuNulo(campos.get("categoria")),
    imagem: textoOuNulo(campos.get("imagem")),
    dataInicio: dataParaApi(campos.get("dataInicio")),
    dataFim: dataParaApi(campos.get("dataFim")),
    descricao: textoOuNulo(campos.get("descricao")),
    localNome: textoOuNulo(campos.get("localNome")),
    cep: textoOuNulo(campos.get("cep")),
    rua: textoOuNulo(campos.get("rua")),
    cidade: textoOuNulo(campos.get("cidade")),
    estado: textoOuNulo(campos.get("estado")),
    nomeProdutor: textoOuNulo(campos.get("nomeProdutor")),
  };
}

function mostrarErros(mensagens) {
  elErros.innerHTML = `<ul>${mensagens.map((m) => `<li>${escapar(m)}</li>`).join("")}</ul>`;
  elErros.hidden = false;
  elErros.scrollIntoView({ behavior: "smooth", block: "center" });
}

function esconderErros() {
  elErros.hidden = true;
  elErros.innerHTML = "";
}

form.addEventListener("submit", async (evento) => {
  // Impede o navegador de recarregar a página.
  evento.preventDefault();
  esconderErros();

  // Validação do HTML (required, minlength, pattern...) antes de chamar a API.
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const dados = lerFormulario();

  if (dados.dataFim && dados.dataFim < dados.dataInicio) {
    mostrarErros(["A data de término não pode ser anterior à data de início."]);
    return;
  }

  botao.disabled = true;
  botao.textContent = "Publicando...";

  try {
    const criado = await criarEvento(dados);
    window.location.href = `evento.html?id=${criado.id}`;
  } catch (erro) {
    console.error(erro);

    if (erro.detalhes && erro.detalhes.length > 0) {
      mostrarErros(erro.detalhes);
    } else if (erro.status) {
      mostrarErros([`A API recusou o pedido (erro ${erro.status}).`]);
    } else {
      mostrarErros(["Não foi possível falar com a API. Ela está rodando?"]);
    }

    botao.disabled = false;
    botao.textContent = "Publicar evento";
  }
});
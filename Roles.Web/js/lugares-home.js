import { listarLugaresDaHome } from "./api.js";
import { escapar } from "./util.js";

const elSecao = document.getElementById("lugares");
const elLista = document.getElementById("lugares-lista");

// Quantos lugares aparecem na home.
const LIMITE = 4;

const ICONE_RELOGIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const ICONE_LOCAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

// "18:00:00" ou "18:00" -> minutos desde a meia-noite.
function minutos(texto) {
  const [h, m] = String(texto).split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

// "18:00:00" -> "18:00"
function hhmm(texto) {
  return String(texto).slice(0, 5);
}

// Descobre se o lugar está aberto agora e qual texto mostrar.
// Devolve null quando o lugar não tem horários cadastrados.
function situacao(horarios, agora = new Date()) {
  if (!Array.isArray(horarios) || horarios.length === 0) return null;

  const dia = agora.getDay(); // 0 = domingo
  const min = agora.getHours() * 60 + agora.getMinutes();
  const hoje = horarios.find((h) => h.diaSemana === dia);
  const ontem = horarios.find((h) => h.diaSemana === (dia + 6) % 7);

  // Madrugada: o horário de ontem passou da meia-noite e ainda não fechou.
  if (ontem && !ontem.fechado && ontem.abre && ontem.fecha) {
    const abre = minutos(ontem.abre);
    const fecha = minutos(ontem.fecha);
    if (fecha <= abre && min < fecha) {
      return { aberto: true, texto: `Até as ${hhmm(ontem.fecha)}` };
    }
  }

  if (!hoje || hoje.fechado || !hoje.abre || !hoje.fecha) {
    return { aberto: false, texto: "Fechado hoje" };
  }

  const abre = minutos(hoje.abre);
  const fecha = minutos(hoje.fecha);
  const viraNoite = fecha <= abre;
  const aberto = viraNoite ? min >= abre : min >= abre && min < fecha;

  if (aberto) return { aberto: true, texto: `Até as ${hhmm(hoje.fecha)}` };
  if (min < abre) return { aberto: false, texto: `Abre às ${hhmm(hoje.abre)}` };
  return { aberto: false, texto: "Fechado por hoje" };
}

// Faixa de preço: aceita número (1 a 3) ou texto pronto ("$$").
function htmlPreco(faixa) {
  if (faixa === null || faixa === undefined || faixa === "") return "";

  const numero = Number(faixa);
  if (Number.isInteger(numero)) {
    if (numero <= 0) return `<span class="lg-preco gratis">Grátis</span>`;
    return `<span class="lg-preco">${"$".repeat(Math.min(numero, 4))}</span>`;
  }

  return `<span class="lg-preco">${escapar(faixa)}</span>`;
}

function htmlCard(l) {
  const tom = Number(l.id) % 6;
  const estado = situacao(l.horarios);

  const capa = l.imagem
    ? `<img src="${escapar(l.imagem)}" alt="" loading="lazy">`
    : `<span class="ev-inicial">${escapar(String(l.nome).charAt(0).toUpperCase())}</span>`;

  const status = estado
    ? `<span class="lg-status${estado.aberto ? "" : " fechado"}"><span class="lg-bolinha"></span>${estado.aberto ? "Aberto agora" : "Fechado"}</span>`
    : "";

  const tag = l.tipo ? `<span class="ev-tag">${escapar(l.tipo)}</span>` : "";

  const local = [l.bairro, l.cidade].filter(Boolean).join(" · ");
  const linhaLocal = local ? `<p class="ev-linha">${ICONE_LOCAL}<span>${escapar(local)}</span></p>` : "";
  const linhaHorario = estado
    ? `<p class="ev-linha">${ICONE_RELOGIO}<span>${escapar(estado.texto)}</span></p>`
    : "";

  return `
    <li class="ev-card">
      <a href="lugar.html?id=${Number(l.id)}">
        <div class="ev-capa tom-${tom}">
          ${capa}
          ${status}
          ${tag}
        </div>
        <div class="ev-corpo">
          <div class="lg-titulo">
            <h3>${escapar(l.nome)}</h3>
            ${htmlPreco(l.faixaPreco)}
          </div>
          ${linhaLocal}
          ${linhaHorario}
        </div>
      </a>
    </li>`;
}

async function iniciar() {
  try {
    const lugares = await listarLugaresDaHome();
    if (!Array.isArray(lugares) || lugares.length === 0) return;

    elLista.innerHTML = lugares.slice(0, LIMITE).map(htmlCard).join("");
    elSecao.hidden = false;
  } catch (erro) {
    // Se falhar, a seção simplesmente não aparece e o resto da home segue normal.
    console.error(erro);
  }
}

iniciar();
import { buscarLugar, listarEventosDoLugar } from "./api.js";
import { escapar, formatarDataCompleta } from "./util.js";
import { situacao, NOMES_DIAS } from "./horarios.js";

const elStatus = document.getElementById("status");
const elTopo = document.getElementById("topo");
const elCorpo = document.getElementById("corpo");

// Lê o ?id=1 do endereço da página.
const id = Number(new URLSearchParams(window.location.search).get("id"));

const ICONE_RELOGIO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const ICONE_LOCAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

// Segunda a domingo, nessa ordem, na tabela de horários.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

function dataValida(iso) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

function htmlHorarios(horarios) {
  if (!horarios || horarios.length === 0) {
    return `<p class="suave">Horários não informados.</p>`;
  }

  const porDia = new Map(horarios.map((h) => [h.diaSemana, h]));
  const hoje = new Date().getDay();

  const linhas = ORDEM_DIAS.map((dia) => {
    const h = porDia.get(dia);
    let texto = "Não informado";
    if (h) texto = h.fechado ? "Fechado" : `${h.abre} às ${h.fecha}`;

    return `<li${dia === hoje ? ` class="hoje"` : ""}>
      <span>${escapar(NOMES_DIAS[dia])}</span>
      <span>${escapar(texto)}</span>
    </li>`;
  }).join("");

  return `<ul class="lu-horarios">${linhas}</ul>`;
}

function htmlEventos(eventos) {
  const agora = Date.now();

  // Só eventos que ainda não terminaram.
  const proximos = eventos.filter((e) => {
    const fim = dataValida(e.dataFim ?? e.dataInicio);
    return fim && fim.getTime() >= agora;
  });

  if (proximos.length === 0) {
    return `<p class="suave">Nenhum evento marcado por enquanto.</p>`;
  }

  const itens = proximos
    .map((e) => {
      const data = dataValida(e.dataInicio);
      const dia = data ? String(data.getDate()).padStart(2, "0") : "";
      const mes = data ? data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") : "";
      const quando = data ? formatarDataCompleta(e.dataInicio) : "";

      return `
        <li class="lu-evento">
          <a href="evento.html?id=${Number(e.id)}">
            <span class="lu-ev-data"><strong>${escapar(dia)}</strong><small>${escapar(mes)}</small></span>
            <span class="lu-ev-texto">
              <strong>${escapar(e.nome)}</strong>
              <span>${escapar(quando)}</span>
            </span>
            <span class="lu-ev-ver">Ver evento →</span>
          </a>
        </li>`;
    })
    .join("");

  return `<ul class="lu-eventos">${itens}</ul>`;
}

function renderizar(l) {
  document.title = `${l.nome} · Rolês`;

  const tom = Number(l.id ?? id) % 6;
  const faixa = Math.min(3, Math.max(0, Number(l.faixaPreco) || 0));

  const fundo = l.imagem
    ? `<img src="${escapar(l.imagem)}" alt="">`
    : `<span class="lu-inicial">${escapar(l.nome.charAt(0).toUpperCase())}</span>`;

  const selo = faixa ? `<span class="lu-preco">${"$".repeat(faixa)}</span>` : "";

  const etiqueta = `${l.tipo}${faixa ? ` · ${"$".repeat(faixa)}` : ""}`;

  const situ = situacao(l.horarios);
  const linhaSituacao = situ
    ? `<p class="lu-linha">${ICONE_RELOGIO}<span class="${situ.aberto ? "aberto" : "fechado"}">${escapar(situ.texto)}</span></p>`
    : "";

  const cidadeEstado = [l.cidade, l.estado].filter(Boolean).join("/");
  const endereco = [l.rua, l.bairro, cidadeEstado].filter(Boolean).join(" · ");
  const linhaEndereco = endereco
    ? `<p class="lu-linha">${ICONE_LOCAL}<span>${escapar(endereco)}</span></p>`
    : "";

  const consultaMapa = encodeURIComponent([l.nome, l.rua, l.bairro, l.cidade, l.estado].filter(Boolean).join(", "));
  const botoes = [
    `<a class="lu-btn principal" href="https://www.google.com/maps/search/?api=1&query=${consultaMapa}" target="_blank" rel="noopener">Como chegar</a>`,
  ];
  if (l.instagram) {
    botoes.push(
      `<a class="lu-btn" href="https://instagram.com/${encodeURIComponent(l.instagram)}" target="_blank" rel="noopener">Instagram</a>`
    );
  }
  if (l.telefone) {
    botoes.push(`<a class="lu-btn" href="tel:${escapar(String(l.telefone).replace(/[^\d+]/g, ""))}">Ligar</a>`);
  }

  elTopo.innerHTML = `
    <div class="lu-topo">
      <div class="lu-info">
        <span class="lu-etiqueta">${escapar(etiqueta)}</span>
        <h1>${escapar(l.nome)}</h1>
        ${linhaSituacao}
        ${linhaEndereco}
        <div class="lu-botoes">${botoes.join("")}</div>
      </div>

      <div class="lu-capa tom-${tom}">
        ${fundo}
        ${selo}
      </div>
    </div>`;

  const sobre = l.descricao
    ? `<section>
         <h2>Sobre</h2>
         <p class="lu-descricao">${escapar(l.descricao)}</p>
       </section>`
    : "<section></section>";

  elCorpo.innerHTML = `
    <section>
      <h2>Próximos eventos aqui</h2>
      <div id="eventos-lugar"><p class="suave">Carregando eventos...</p></div>
    </section>

    <div class="lu-baixo">
      ${sobre}
      <section>
        <h2>Horários</h2>
        ${htmlHorarios(l.horarios)}
      </section>
    </div>`;
}

// Os eventos vêm em uma segunda chamada: se falharem, o lugar continua na tela.
async function carregarEventos() {
  const elEventos = document.getElementById("eventos-lugar");

  try {
    const eventos = await listarEventosDoLugar(id);
    elEventos.innerHTML = htmlEventos(eventos);
  } catch (erro) {
    elEventos.innerHTML = `<p class="suave">Não foi possível carregar os eventos.</p>`;
    console.error(erro);
  }
}

async function iniciar() {
  if (!Number.isInteger(id) || id <= 0) {
    elStatus.textContent = "Lugar não encontrado.";
    return;
  }

  try {
    const lugar = await buscarLugar(id);
    elStatus.hidden = true;
    renderizar(lugar);
    carregarEventos();
  } catch (erro) {
    elStatus.textContent =
      erro.status === 404
        ? "Lugar não encontrado."
        : "Não foi possível carregar o lugar. A API está rodando?";
    console.error(erro);
  }
}

iniciar();
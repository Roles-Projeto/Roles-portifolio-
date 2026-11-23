import { escapar } from "./util.js";

const MAX_SLIDES = 5;
const INTERVALO = 5000;
let timer = null;

const SETA_ESQ = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`;
const SETA_DIR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`;

function dataValida(iso) {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

function htmlSlide(e) {
  const data = dataValida(e.dataInicio);
  const tom = Number(e.id) % 6;

  const fundo = e.imagem
    ? `<img src="${escapar(e.imagem)}" alt="" loading="lazy">`
    : `<span class="car-inicial">${escapar(e.nome.charAt(0).toUpperCase())}</span>`;

  const selo = data
    ? `<span class="ev-data">
         <strong>${String(data.getDate()).padStart(2, "0")}</strong>
         <small>${escapar(data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""))}</small>
       </span>`
    : "";

  const tag = e.categoria ? `<span class="ev-tag">${escapar(e.categoria)}</span>` : "";
  const local = [e.localNome, e.cidade].filter(Boolean).join(" · ");

  return `
    <a class="car-slide tom-${tom}" href="evento.html?id=${Number(e.id)}">
      ${fundo}
      ${selo}
      ${tag}
      <div class="car-info">
        <div>
          <h3>${escapar(e.nome)}</h3>
          <p>${escapar(local)}</p>
        </div>
        <span class="car-ver">Ver evento</span>
      </div>
    </a>`;
}

export function montarCarrossel(el, eventos) {
  clearInterval(timer);

  const agora = Date.now();
  const proximos = eventos.filter((e) => {
    const d = dataValida(e.dataInicio);
    return d && d.getTime() >= agora;
  });
  const slides = (proximos.length ? proximos : eventos).slice(0, MAX_SLIDES);

  if (slides.length === 0) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
    <div class="car-janela">
      <div class="car-trilho">${slides.map(htmlSlide).join("")}</div>
      <button type="button" class="car-seta car-ant" data-dir="-1" aria-label="Evento anterior">${SETA_ESQ}</button>
      <button type="button" class="car-seta car-prox" data-dir="1" aria-label="Próximo evento">${SETA_DIR}</button>
    </div>
    <div class="car-pontos">
      ${slides.map((_, i) => `<button type="button" class="car-ponto" data-i="${i}" aria-label="Ir para o evento ${i + 1}"></button>`).join("")}
    </div>`;
  el.classList.toggle("car-unico", slides.length === 1);
  el.hidden = false;

  const janela = el.querySelector(".car-janela");
  const trilho = el.querySelector(".car-trilho");
  const itens = [...el.querySelectorAll(".car-slide")];
  const pontos = [...el.querySelectorAll(".car-ponto")];
  const total = itens.length;
  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let atual = 0;

  function ir(i) {
    atual = (i + total) % total;
    trilho.style.transform = `translateX(-${atual * 100}%)`;
    itens.forEach((s, n) => {
      s.tabIndex = n === atual ? 0 : -1;
      s.setAttribute("aria-hidden", n === atual ? "false" : "true");
    });
    pontos.forEach((p, n) => p.classList.toggle("ativo", n === atual));
  }

  function parar() {
    clearInterval(timer);
  }

  function iniciar() {
    parar();
    if (total > 1 && !reduzMovimento) {
      timer = setInterval(() => ir(atual + 1), INTERVALO);
    }
  }

  el.onclick = (evento) => {
    const seta = evento.target.closest("[data-dir]");
    const ponto = evento.target.closest("[data-i]");
    if (seta) ir(atual + Number(seta.dataset.dir));
    if (ponto) ir(Number(ponto.dataset.i));
    if (seta || ponto) iniciar();
  };

  el.onmouseenter = parar;
  el.onmouseleave = iniciar;
  el.onfocusin = parar;
  el.onfocusout = iniciar;

  // Deslizar no celular
  let inicioX = null;
  janela.addEventListener("touchstart", (t) => {
    inicioX = t.touches[0].clientX;
    parar();
  }, { passive: true });
  janela.addEventListener("touchend", (t) => {
    if (inicioX !== null) {
      const dx = t.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
    }
    inicioX = null;
    iniciar();
  });

  ir(0);
  iniciar();
}
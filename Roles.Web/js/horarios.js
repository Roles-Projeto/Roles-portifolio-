export const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export const NOMES_DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function minutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Diz se o lugar está aberto agora e escreve o texto.
// Se "fecha" for menor ou igual a "abre", o lugar fecha na madrugada do dia seguinte.
export function situacao(horarios, agora = new Date()) {
  if (!horarios || horarios.length === 0) return null;

  const porDia = new Map(horarios.map((h) => [h.diaSemana, h]));
  const hoje = agora.getDay();
  const min = agora.getHours() * 60 + agora.getMinutes();

  // Ainda dentro do turno que começou ontem e termina na madrugada de hoje.
  const ontem = porDia.get((hoje + 6) % 7);
  if (ontem && !ontem.fechado && ontem.abre && ontem.fecha) {
    const abre = minutos(ontem.abre);
    const fecha = minutos(ontem.fecha);
    if (fecha <= abre && min < fecha) {
      return { aberto: true, texto: `Aberto até ${ontem.fecha}` };
    }
  }

  const h = porDia.get(hoje);
  if (h && !h.fechado && h.abre && h.fecha) {
    const abre = minutos(h.abre);
    const fecha = minutos(h.fecha);
    const viraNoite = fecha <= abre;

    if (min >= abre && (viraNoite || min < fecha)) {
      return { aberto: true, texto: `Aberto até ${h.fecha}` };
    }
    if (min < abre) {
      return { aberto: false, texto: `Fechado · abre ${h.abre}` };
    }
  }

  for (let i = 1; i <= 7; i++) {
    const dia = (hoje + i) % 7;
    const proximo = porDia.get(dia);
    if (proximo && !proximo.fechado && proximo.abre) {
      const quando = i === 1 ? "amanhã" : DIAS[dia];
      return { aberto: false, texto: `Fechado · abre ${quando} ${proximo.abre}` };
    }
  }

  return { aberto: false, texto: "Fechado" };
}
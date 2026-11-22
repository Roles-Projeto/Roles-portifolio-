// Funções de apoio usadas por mais de uma página.

// Transforma caracteres especiais em texto seguro antes de colocar no HTML.
export function escapar(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Ex.: "20 dez · 20:00"
export function formatarData(iso) {
  const data = new Date(iso);
  const dia = data
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} · ${hora}`;
}

// Ex.: "sábado, 20 de dezembro de 2026 às 20:00"
export function formatarDataCompleta(iso) {
  const data = new Date(iso);
  const dia = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

// Ex.: 80 -> "R$ 80,00"
export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}
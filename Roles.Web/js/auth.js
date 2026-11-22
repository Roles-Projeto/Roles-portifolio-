// Guarda e lê a sessão (token + dados do usuário) no navegador.
const CHAVE = "roles.sessao";

export function salvarSessao({ token, expiraEm, usuario }) {
  localStorage.setItem(CHAVE, JSON.stringify({ token, expiraEm, usuario }));
}

export function limparSessao() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // sem acesso ao armazenamento: nada a limpar
  }
}

// Devolve a sessão, ou null se não houver ou se o token já venceu.
export function lerSessao() {
  try {
    const sessao = JSON.parse(localStorage.getItem(CHAVE));
    if (!sessao?.token) return null;

    if (new Date(sessao.expiraEm) <= new Date()) {
      limparSessao();
      return null;
    }

    return sessao;
  } catch {
    return null;
  }
}

export function estaLogada() {
  return lerSessao() !== null;
}

export function lerToken() {
  return lerSessao()?.token ?? null;
}

export function lerUsuario() {
  return lerSessao()?.usuario ?? null;
}

export function sair() {
  limparSessao();
  window.location.href = "index.html";
}

// Lê ?voltar=pagina.html do endereço. Só aceita nomes de página nossos
// (letras e hífen + .html), para ninguém redirecionar para outro site.
export function destinoDepoisDoLogin() {
  const voltar = new URLSearchParams(window.location.search).get("voltar") ?? "";
  return /^[a-z-]+\.html$/.test(voltar) ? voltar : "index.html";
}
// Troque pelos seus dados do Cloudinary.
const CLOUD_NAME = "ihvjzebo";
const UPLOAD_PRESET = "roles_upload";

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

// Devolve um texto de erro, ou null se o arquivo está ok.
export function validarImagem(arquivo) {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return "A imagem passa de 5 MB. Escolha uma menor.";
  }
  return null;
}

// Envia o arquivo e devolve a URL pública (https).
export async function enviarImagem(arquivo) {
  const problema = validarImagem(arquivo);
  if (problema) throw new Error(problema);

  const corpo = new FormData();
  corpo.append("file", arquivo);
  corpo.append("upload_preset", UPLOAD_PRESET);

  const resposta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: corpo,
  });

  if (!resposta.ok) throw new Error("Não foi possível enviar a imagem. Tente de novo.");

  const dados = await resposta.json();
  return dados.secure_url;
}
using System.ComponentModel.DataAnnotations;

namespace Roles.Api.Models;

public class RegistroDto
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(100, MinimumLength = 2)]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "Informe um e-mail válido.")]
    [StringLength(200)]
    public string Email { get; set; } = string.Empty;

    // O BCrypt só considera os primeiros 72 bytes, por isso o limite.
    [Required(ErrorMessage = "A senha é obrigatória.")]
    [StringLength(72, MinimumLength = 8, ErrorMessage = "A senha deve ter entre 8 e 72 caracteres.")]
    public string Senha { get; set; } = string.Empty;
}
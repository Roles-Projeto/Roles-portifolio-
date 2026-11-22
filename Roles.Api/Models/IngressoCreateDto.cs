using System.ComponentModel.DataAnnotations;

namespace Roles.Api.Models;

public class IngressoCreateDto
{
    [Required(ErrorMessage = "O título do ingresso é obrigatório.")]
    [StringLength(100, MinimumLength = 2)]
    public string Titulo { get; set; } = string.Empty;

    [Required(ErrorMessage = "O tipo é obrigatório.")]
    [RegularExpression("^(pago|gratuito)$", ErrorMessage = "O tipo deve ser 'pago' ou 'gratuito'.")]
    public string Tipo { get; set; } = "pago";

    [Range(0, 100000, ErrorMessage = "O valor deve estar entre 0 e 100000.")]
    public decimal Valor { get; set; }

    [Range(1, 1000000, ErrorMessage = "A quantidade deve ser de pelo menos 1.")]
    public int QuantidadeTotal { get; set; }
}
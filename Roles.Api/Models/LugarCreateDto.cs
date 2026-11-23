using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace Roles.Api.Models;

public class LugarCreateDto : IValidatableObject
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(200, MinimumLength = 3)]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O tipo é obrigatório.")]
    [StringLength(50)]
    public string Tipo { get; set; } = string.Empty;

    public string? Descricao { get; set; }

    [StringLength(500)]
    public string? Imagem { get; set; }

    [Range(1, 3, ErrorMessage = "A faixa de preço vai de 1 a 3.")]
    public int? FaixaPreco { get; set; }

    [StringLength(9)]
    public string? Cep { get; set; }

    [StringLength(200)]
    public string? Rua { get; set; }

    [StringLength(100)]
    public string? Bairro { get; set; }

    [Required(ErrorMessage = "A cidade é obrigatória.")]
    [StringLength(100)]
    public string? Cidade { get; set; }

    [StringLength(2, MinimumLength = 2, ErrorMessage = "Use a sigla do estado, ex: GO.")]
    public string? Estado { get; set; }

    [StringLength(20)]
    public string? Telefone { get; set; }

    [StringLength(100)]
    public string? Instagram { get; set; }

    public List<LugarHorarioDto> Horarios { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext contexto)
    {
        if (!LugarTipos.Todos.Contains(Tipo))
        {
            yield return new ValidationResult(
                $"Tipo inválido. Use um destes: {string.Join(", ", LugarTipos.Todos)}.",
                new[] { nameof(Tipo) });
        }

        if (Horarios.Select(h => h.DiaSemana).Distinct().Count() != Horarios.Count)
        {
            yield return new ValidationResult(
                "Há dias da semana repetidos nos horários.",
                new[] { nameof(Horarios) });
        }
    }
}

public class LugarHorarioDto : IValidatableObject
{
    private static readonly Regex FormatoHora = new(@"^([01]\d|2[0-3]):[0-5]\d$");

    [Range(0, 6, ErrorMessage = "O dia da semana vai de 0 (domingo) a 6 (sábado).")]
    public int DiaSemana { get; set; }

    public bool Fechado { get; set; }

    public string? Abre { get; set; }
    public string? Fecha { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext contexto)
    {
        if (Fechado) yield break;

        if (Abre is null || !FormatoHora.IsMatch(Abre))
            yield return new ValidationResult("Informe a hora de abertura no formato HH:mm.", new[] { nameof(Abre) });

        if (Fecha is null || !FormatoHora.IsMatch(Fecha))
            yield return new ValidationResult("Informe a hora de fechamento no formato HH:mm.", new[] { nameof(Fecha) });
    }
}
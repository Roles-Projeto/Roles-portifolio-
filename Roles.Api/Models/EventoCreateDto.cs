using System.ComponentModel.DataAnnotations;

namespace Roles.Api.Models;

public class EventoCreateDto
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(200, MinimumLength = 3)]
    public string Nome { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Assunto { get; set; }

    [StringLength(100)]
    public string? Categoria { get; set; }

    [StringLength(500)]
    public string? Imagem { get; set; }

    [Required(ErrorMessage = "A data de início é obrigatória.")]
    public DateTime DataInicio { get; set; }

    public DateTime? DataFim { get; set; }

    public string? Descricao { get; set; }

    [StringLength(200)]
    public string? LocalNome { get; set; }

    [StringLength(9)]
    public string? Cep { get; set; }

    [StringLength(200)]
    public string? Rua { get; set; }

    [StringLength(100)]
    public string? Cidade { get; set; }

    [StringLength(2, MinimumLength = 2, ErrorMessage = "Use a sigla do estado, ex: GO.")]
    public string? Estado { get; set; }

    [StringLength(200)]
    public string? NomeProdutor { get; set; }
        public int? LugarId { get; set; }
}
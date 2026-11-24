using System.ComponentModel.DataAnnotations;

namespace Roles.Api.Models;

public class PedidoItemDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Ingresso inválido.")]
    public int IngressoId { get; set; }

    [Range(1, 10, ErrorMessage = "A quantidade de cada ingresso deve ser de 1 a 10.")]
    public int Quantidade { get; set; }
}

public class PedidoCreateDto
{
    [Required(ErrorMessage = "Escolha pelo menos um ingresso.")]
    [MinLength(1, ErrorMessage = "Escolha pelo menos um ingresso.")]
    public List<PedidoItemDto> Itens { get; set; } = new();
}
namespace Roles.Api.Models;

public class Ingresso
{
    public int Id { get; set; }
    public int EventoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Tipo { get; set; } = "pago";
    public decimal Valor { get; set; }
    public int QuantidadeTotal { get; set; }
}
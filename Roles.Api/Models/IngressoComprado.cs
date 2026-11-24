namespace Roles.Api.Models;

// Um ingresso comprado (uma linha por unidade), com código único.
// Mais adiante, o assento numerado entra aqui como uma coluna nova.
public class IngressoComprado
{
    public int Id { get; set; }
    public int PedidoId { get; set; }
    public int IngressoId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public decimal ValorPago { get; set; }
}
namespace Roles.Api.Models;

// Uma compra: quem comprou, de qual evento e quanto pagou no total.
public class Pedido
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    public int EventoId { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "pago";
    public DateTime CriadoEm { get; set; }
}
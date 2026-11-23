namespace Roles.Api.Models;

public class Lugar
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public string? Imagem { get; set; }

    // 1 = $, 2 = $$, 3 = $$$
    public int? FaixaPreco { get; set; }

    public string? Cep { get; set; }
    public string? Rua { get; set; }
    public string? Bairro { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }

    public string? Telefone { get; set; }

    // Só o usuário, sem o @ (ex.: "clubaurora").
    public string? Instagram { get; set; }

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    // Dono do lugar (quem cadastrou). Vem do token, nunca do corpo do pedido.
    public int? UsuarioId { get; set; }

    public List<LugarHorario> Horarios { get; set; } = new();
}
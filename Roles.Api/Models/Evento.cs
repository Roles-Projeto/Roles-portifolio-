namespace Roles.Api.Models;

public class Evento
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Assunto { get; set; }
    public string? Categoria { get; set; }
    public string? Imagem { get; set; }
    public DateTime DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public string? Descricao { get; set; }
    public string? LocalNome { get; set; }
    public string? Cep { get; set; }
    public string? Rua { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string? NomeProdutor { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
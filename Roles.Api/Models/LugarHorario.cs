namespace Roles.Api.Models;

public class LugarHorario
{
    public int Id { get; set; }
    public int LugarId { get; set; }

    // 0 = domingo ... 6 = sábado
    public int DiaSemana { get; set; }

    public bool Fechado { get; set; }

    // "HH:mm". Se Fecha for menor que Abre, o lugar fecha na madrugada do dia seguinte.
    public string? Abre { get; set; }
    public string? Fecha { get; set; }
}
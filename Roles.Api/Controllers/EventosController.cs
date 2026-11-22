using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Roles.Api.Data;
using Roles.Api.Models;

namespace Roles.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventosController : ControllerBase
{
    private readonly AppDbContext _db;

    public EventosController(AppDbContext db)
    {
        _db = db;
    }

    // GET api/eventos?cidade=Goiânia&categoria=Shows
    [HttpGet]
    public async Task<ActionResult<List<Evento>>> GetAll(
        [FromQuery] string? cidade,
        [FromQuery] string? categoria)
    {
        var query = _db.Eventos.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(cidade))
            query = query.Where(e => EF.Functions.ILike(e.Cidade!, cidade));

        if (!string.IsNullOrWhiteSpace(categoria))
            query = query.Where(e => EF.Functions.ILike(e.Categoria!, categoria));

        var eventos = await query
            .OrderBy(e => e.DataInicio)
            .ToListAsync();

        return Ok(eventos);
    }

    // GET api/eventos/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Evento>> GetById(int id)
    {
        var evento = await _db.Eventos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id);

        if (evento is null)
            return NotFound(new { mensagem = $"Evento {id} não encontrado." });

        return Ok(evento);
    }
}
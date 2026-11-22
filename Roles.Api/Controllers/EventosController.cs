using Microsoft.AspNetCore.Authorization;
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

    // Lê o id do usuário que está dentro do token ("sub").
    private int? UsuarioLogadoId()
    {
        var valor = User.FindFirst("sub")?.Value;
        return int.TryParse(valor, out var id) ? id : null;
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

    // POST api/eventos  (precisa estar logada)
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Evento>> Create(EventoCreateDto dto)
    {
        var usuarioId = UsuarioLogadoId();
        if (usuarioId is null)
            return Unauthorized(new { mensagem = "Faça login para criar eventos." });

        if (dto.DataFim.HasValue && dto.DataFim.Value < dto.DataInicio)
            return BadRequest(new { mensagem = "A data de fim não pode ser anterior à data de início." });

        var evento = new Evento
        {
            Nome = dto.Nome.Trim(),
            Assunto = dto.Assunto,
            Categoria = dto.Categoria,
            Imagem = dto.Imagem,
            DataInicio = SemFuso(dto.DataInicio),
            DataFim = dto.DataFim.HasValue ? SemFuso(dto.DataFim.Value) : null,
            Descricao = dto.Descricao,
            LocalNome = dto.LocalNome,
            Cep = dto.Cep,
            Rua = dto.Rua,
            Cidade = dto.Cidade,
            Estado = dto.Estado?.ToUpperInvariant(),
            NomeProdutor = dto.NomeProdutor,
            CriadoEm = SemFuso(DateTime.UtcNow),
            UsuarioId = usuarioId
        };

        _db.Eventos.Add(evento);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = evento.Id }, evento);
    }

    // PUT api/eventos/1  (só a dona do evento)
    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Evento>> Update(int id, EventoCreateDto dto)
    {
        var evento = await _db.Eventos.FirstOrDefaultAsync(e => e.Id == id);

        if (evento is null)
            return NotFound(new { mensagem = $"Evento {id} não encontrado." });

        if (evento.UsuarioId != UsuarioLogadoId())
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Só quem criou o evento pode alterá-lo." });

        if (dto.DataFim.HasValue && dto.DataFim.Value < dto.DataInicio)
            return BadRequest(new { mensagem = "A data de fim não pode ser anterior à data de início." });

        evento.Nome = dto.Nome.Trim();
        evento.Assunto = dto.Assunto;
        evento.Categoria = dto.Categoria;
        evento.Imagem = dto.Imagem;
        evento.DataInicio = SemFuso(dto.DataInicio);
        evento.DataFim = dto.DataFim.HasValue ? SemFuso(dto.DataFim.Value) : null;
        evento.Descricao = dto.Descricao;
        evento.LocalNome = dto.LocalNome;
        evento.Cep = dto.Cep;
        evento.Rua = dto.Rua;
        evento.Cidade = dto.Cidade;
        evento.Estado = dto.Estado?.ToUpperInvariant();
        evento.NomeProdutor = dto.NomeProdutor;

        await _db.SaveChangesAsync();

        return Ok(evento);
    }

    // DELETE api/eventos/1  (só a dona do evento)
    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var evento = await _db.Eventos.FirstOrDefaultAsync(e => e.Id == id);

        if (evento is null)
            return NotFound(new { mensagem = $"Evento {id} não encontrado." });

        if (evento.UsuarioId != UsuarioLogadoId())
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Só quem criou o evento pode apagá-lo." });

        _db.Eventos.Remove(evento);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // A coluna é "timestamp without time zone"; o Npgsql recusa DateTime com Kind=Utc nela.
    private static DateTime SemFuso(DateTime data) =>
        DateTime.SpecifyKind(data, DateTimeKind.Unspecified);
}
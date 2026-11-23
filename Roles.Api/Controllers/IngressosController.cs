using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Roles.Api.Data;
using Roles.Api.Models;

namespace Roles.Api.Controllers;

[ApiController]
[Route("api/eventos/{eventoId:int}/ingressos")]
public class IngressosController : ControllerBase
{
    private readonly AppDbContext _db;

    public IngressosController(AppDbContext db)
    {
        _db = db;
    }

    private int? UsuarioLogadoId()
    {
        var valor = User.FindFirst("sub")?.Value;
        return int.TryParse(valor, out var id) ? id : null;
    }

    // Regras de tipo e valor, iguais para criar e editar.
    private string? ValidarTipoEValor(IngressoCreateDto dto)
    {
        if (dto.Tipo == "gratuito" && dto.Valor != 0)
            return "Ingresso gratuito deve ter valor 0.";

        if (dto.Tipo == "pago" && dto.Valor <= 0)
            return "Ingresso pago precisa ter valor maior que 0.";

        return null;
    }

    // GET api/eventos/1/ingressos
    [HttpGet]
    public async Task<ActionResult<List<Ingresso>>> GetByEvento(int eventoId)
    {
        if (!await _db.Eventos.AnyAsync(e => e.Id == eventoId))
            return NotFound(new { mensagem = $"Evento {eventoId} não encontrado." });

        var ingressos = await _db.Ingressos
            .AsNoTracking()
            .Where(i => i.EventoId == eventoId)
            .OrderBy(i => i.Valor)
            .ThenBy(i => i.Id)
            .ToListAsync();

        return Ok(ingressos);
    }

    // POST api/eventos/1/ingressos  (só a dona do evento)
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Ingresso>> Create(int eventoId, IngressoCreateDto dto)
    {
        var evento = await _db.Eventos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventoId);

        if (evento is null)
            return NotFound(new { mensagem = $"Evento {eventoId} não encontrado." });

        if (evento.UsuarioId != UsuarioLogadoId())
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Só quem criou o evento pode cadastrar ingressos nele." });

        var erro = ValidarTipoEValor(dto);
        if (erro is not null)
            return BadRequest(new { mensagem = erro });

        var ingresso = new Ingresso
        {
            EventoId = eventoId,
            Titulo = dto.Titulo.Trim(),
            Tipo = dto.Tipo,
            Valor = dto.Valor,
            QuantidadeTotal = dto.QuantidadeTotal
        };

        _db.Ingressos.Add(ingresso);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByEvento), new { eventoId }, ingresso);
    }

    // PUT api/eventos/1/ingressos/5  (só a dona do evento)
    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Ingresso>> Update(int eventoId, int id, IngressoCreateDto dto)
    {
        var evento = await _db.Eventos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventoId);

        if (evento is null)
            return NotFound(new { mensagem = $"Evento {eventoId} não encontrado." });

        if (evento.UsuarioId != UsuarioLogadoId())
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Só quem criou o evento pode alterar os ingressos dele." });

        // Confere o evento também, para não editar ingresso de outro evento pela URL errada.
        var ingresso = await _db.Ingressos
            .FirstOrDefaultAsync(i => i.Id == id && i.EventoId == eventoId);

        if (ingresso is null)
            return NotFound(new { mensagem = $"Ingresso {id} não encontrado neste evento." });

        var erro = ValidarTipoEValor(dto);
        if (erro is not null)
            return BadRequest(new { mensagem = erro });

        ingresso.Titulo = dto.Titulo.Trim();
        ingresso.Tipo = dto.Tipo;
        ingresso.Valor = dto.Valor;
        ingresso.QuantidadeTotal = dto.QuantidadeTotal;

        await _db.SaveChangesAsync();

        return Ok(ingresso);
    }

    // DELETE api/eventos/1/ingressos/5  (só a dona do evento)
    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int eventoId, int id)
    {
        var evento = await _db.Eventos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventoId);

        if (evento is null)
            return NotFound(new { mensagem = $"Evento {eventoId} não encontrado." });

        if (evento.UsuarioId != UsuarioLogadoId())
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Só quem criou o evento pode apagar os ingressos dele." });

        var ingresso = await _db.Ingressos
            .FirstOrDefaultAsync(i => i.Id == id && i.EventoId == eventoId);

        if (ingresso is null)
            return NotFound(new { mensagem = $"Ingresso {id} não encontrado neste evento." });

        _db.Ingressos.Remove(ingresso);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
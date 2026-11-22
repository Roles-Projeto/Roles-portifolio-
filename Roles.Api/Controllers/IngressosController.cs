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

    // POST api/eventos/1/ingressos
    [HttpPost]
    public async Task<ActionResult<Ingresso>> Create(int eventoId, IngressoCreateDto dto)
    {
        if (dto.Tipo == "gratuito" && dto.Valor != 0)
            return BadRequest(new { mensagem = "Ingresso gratuito deve ter valor 0." });

        if (dto.Tipo == "pago" && dto.Valor <= 0)
            return BadRequest(new { mensagem = "Ingresso pago precisa ter valor maior que 0." });

        if (!await _db.Eventos.AnyAsync(e => e.Id == eventoId))
            return NotFound(new { mensagem = $"Evento {eventoId} não encontrado." });

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
}
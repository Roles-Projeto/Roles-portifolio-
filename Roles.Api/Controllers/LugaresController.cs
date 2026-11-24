using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Roles.Api.Data;
using Roles.Api.Models;

namespace Roles.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LugaresController : ControllerBase
{
    private readonly AppDbContext _db;

    public LugaresController(AppDbContext db)
    {
        _db = db;
    }

    // Lê o id do usuário que está dentro do token ("sub").
    private int? UsuarioLogadoId()
    {
        var valor = User.FindFirst("sub")?.Value;
        return int.TryParse(valor, out var id) ? id : null;
    }

    // GET api/lugares?cidade=Goiânia&tipo=Bar&busca=aurora
    [HttpGet]
    public async Task<ActionResult<List<Lugar>>> GetAll(
        [FromQuery] string? cidade,
        [FromQuery] string? tipo,
        [FromQuery] string? busca)
    {
        var query = _db.Lugares
            .AsNoTracking()
            .Include(l => l.Horarios)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(cidade))
            query = query.Where(l => EF.Functions.ILike(l.Cidade!, cidade));

        if (!string.IsNullOrWhiteSpace(tipo))
            query = query.Where(l => EF.Functions.ILike(l.Tipo, tipo));

        if (!string.IsNullOrWhiteSpace(busca))
            query = query.Where(l => EF.Functions.ILike(l.Nome, $"%{busca.Trim()}%"));

        var lugares = await query
            .OrderBy(l => l.Nome)
            .ToListAsync();

        foreach (var lugar in lugares)
            lugar.Horarios = lugar.Horarios.OrderBy(h => h.DiaSemana).ToList();

        return Ok(lugares);
    }

    // GET api/lugares/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Lugar>> GetById(int id)
    {
        var lugar = await _db.Lugares
            .AsNoTracking()
            .Include(l => l.Horarios)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lugar is null)
            return NotFound(new { mensagem = $"Lugar {id} não encontrado." });

        lugar.Horarios = lugar.Horarios.OrderBy(h => h.DiaSemana).ToList();
        return Ok(lugar);
    }

    // GET api/lugares/1/eventos  (eventos que acontecem neste lugar)
    [HttpGet("{id:int}/eventos")]
    public async Task<ActionResult<List<Evento>>> GetEventos(int id)
    {
        if (!await _db.Lugares.AnyAsync(l => l.Id == id))
            return NotFound(new { mensagem = $"Lugar {id} não encontrado." });

        var eventos = await _db.Eventos
            .AsNoTracking()
            .Where(e => e.LugarId == id)
            .OrderBy(e => e.DataInicio)
            .ToListAsync();

        return Ok(eventos);
    }

    // POST api/lugares  (precisa estar logada)
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Lugar>> Create(LugarCreateDto dto)
    {
        var usuarioId = UsuarioLogadoId();
        if (usuarioId is null)
            return Unauthorized(new { mensagem = "Faça login para cadastrar lugares." });

        var lugar = new Lugar
        {
            CriadoEm = SemFuso(DateTime.UtcNow),
            UsuarioId = usuarioId
        };

        Preencher(lugar, dto);
        lugar.Horarios = dto.Horarios.Select(NovoHorario).OrderBy(h => h.DiaSemana).ToList();

        _db.Lugares.Add(lugar);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = lugar.Id }, lugar);
    }

    // PUT api/lugares/1  (só a dona do lugar)
    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Lugar>> Update(int id, LugarCreateDto dto)
    {
        var lugar = await _db.Lugares.FirstOrDefaultAsync(l => l.Id == id);

        if (lugar is null)
            return NotFound(new { mensagem = $"Lugar {id} não encontrado." });

        if (lugar.UsuarioId != UsuarioLogadoId())
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Só quem cadastrou o lugar pode alterá-lo." });

        // Os horários são trocados por inteiro, junto com os dados, numa transação só.
        await using var transacao = await _db.Database.BeginTransactionAsync();

        Preencher(lugar, dto);

        await _db.LugarHorarios.Where(h => h.LugarId == id).ExecuteDeleteAsync();
        lugar.Horarios = dto.Horarios.Select(NovoHorario).OrderBy(h => h.DiaSemana).ToList();

        await _db.SaveChangesAsync();
        await transacao.CommitAsync();

        return Ok(lugar);
    }

    // DELETE api/lugares/1  (só a dona do lugar)
    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var lugar = await _db.Lugares.FirstOrDefaultAsync(l => l.Id == id);

        if (lugar is null)
            return NotFound(new { mensagem = $"Lugar {id} não encontrado." });

        if (lugar.UsuarioId != UsuarioLogadoId())
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Só quem cadastrou o lugar pode apagá-lo." });

        // Os horários vão junto (cascade) e os eventos ficam, só que sem lugar.
        _db.Lugares.Remove(lugar);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Copia os campos do DTO para o lugar (usado na criação e na edição).
    private static void Preencher(Lugar lugar, LugarCreateDto dto)
    {
        lugar.Nome = dto.Nome.Trim();
        lugar.Tipo = dto.Tipo;
        lugar.Descricao = dto.Descricao;
        lugar.Imagem = dto.Imagem;
        lugar.FaixaPreco = dto.FaixaPreco;
        lugar.Cep = dto.Cep;
        lugar.Rua = dto.Rua;
        lugar.Bairro = dto.Bairro;
        lugar.Cidade = dto.Cidade?.Trim();
        lugar.Estado = dto.Estado?.ToUpperInvariant();
        lugar.Telefone = dto.Telefone;
        lugar.Instagram = dto.Instagram?.Trim().TrimStart('@');
    }

    private static LugarHorario NovoHorario(LugarHorarioDto h) => new()
    {
        DiaSemana = h.DiaSemana,
        Fechado = h.Fechado,
        Abre = h.Fechado ? null : h.Abre,
        Fecha = h.Fechado ? null : h.Fecha
    };

    // A coluna é "timestamp without time zone"; o Npgsql recusa DateTime com Kind=Utc nela.
    private static DateTime SemFuso(DateTime data) =>
        DateTime.SpecifyKind(data, DateTimeKind.Unspecified);


        // GET api/lugares/meus  (só os lugares da pessoa logada)
    [Authorize]
    [HttpGet("meus")]
    public async Task<ActionResult<List<Lugar>>> GetMeus()
    {
        var usuarioId = UsuarioLogadoId();
        if (usuarioId is null)
            return Unauthorized(new { mensagem = "Faça login para ver seus lugares." });

        var lugares = await _db.Lugares
            .AsNoTracking()
            .Include(l => l.Horarios)
            .Where(l => l.UsuarioId == usuarioId)
            .OrderBy(l => l.Nome)
            .ToListAsync();

        foreach (var lugar in lugares)
            lugar.Horarios = lugar.Horarios.OrderBy(h => h.DiaSemana).ToList();

        return Ok(lugares);
    }
}


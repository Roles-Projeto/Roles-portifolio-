using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Roles.Api.Data;
using Roles.Api.Models;

namespace Roles.Api.Controllers;

[ApiController]
[Route("api")]
public class PedidosController : ControllerBase
{
    // Limite de ingressos somados em uma única compra.
    private const int MaximoPorPedido = 10;

    // Troque para false se quiser liberar a compra no próprio evento (por exemplo, para testar).
    private const bool BloquearCompraDoProprioEvento = true;

    private readonly AppDbContext _db;

    public PedidosController(AppDbContext db)
    {
        _db = db;
    }

    private int? UsuarioLogadoId()
    {
        var valor = User.FindFirst("sub")?.Value;
        return int.TryParse(valor, out var id) ? id : null;
    }

    private static string NovoCodigo() =>
        "ROL-" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();

    // POST api/eventos/1/pedidos  (quem está logada)
    [Authorize]
    [HttpPost("eventos/{eventoId:int}/pedidos")]
    public async Task<IActionResult> Criar(int eventoId, PedidoCreateDto dto)
    {
        var usuarioId = UsuarioLogadoId();
        if (usuarioId is null)
            return Unauthorized();

        var evento = await _db.Eventos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventoId);

        if (evento is null)
            return NotFound(new { mensagem = $"Evento {eventoId} não encontrado." });

        if (BloquearCompraDoProprioEvento && evento.UsuarioId == usuarioId)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { mensagem = "Você criou este evento, então não pode comprar ingresso dele." });

        // Os horários dos eventos são de Goiânia (UTC-3, sem horário de verão).
        var agora = DateTime.UtcNow.AddHours(-3);
        if ((evento.DataFim ?? evento.DataInicio) < agora)
            return BadRequest(new { mensagem = "Este evento já aconteceu." });

        // Junta linhas repetidas do mesmo ingresso.
        var itens = dto.Itens
            .GroupBy(i => i.IngressoId)
            .Select(g => new { IngressoId = g.Key, Quantidade = g.Sum(i => i.Quantidade) })
            .ToList();

        if (itens.Sum(i => i.Quantidade) > MaximoPorPedido)
            return BadRequest(new { mensagem = $"Cada compra pode ter no máximo {MaximoPorPedido} ingressos." });

        var ids = itens.Select(i => i.IngressoId).ToArray();

        // Tudo ou nada: se algo falhar, a transação desfaz a compra inteira.
        await using var transacao = await _db.Database.BeginTransactionAsync();

        // FOR UPDATE trava essas linhas até o fim da transação, assim duas pessoas
        // não compram o último ingresso ao mesmo tempo.
        var ingressos = await _db.Ingressos
            .FromSqlInterpolated($"SELECT * FROM ingressos WHERE evento_id = {eventoId} AND id = ANY({ids}) FOR UPDATE")
            .ToListAsync();

        if (ingressos.Count != ids.Length)
            return BadRequest(new { mensagem = "Algum ingresso escolhido não pertence a este evento." });

        var vendidos = await (
            from c in _db.IngressosComprados
            join p in _db.Pedidos on c.PedidoId equals p.Id
            where ids.Contains(c.IngressoId) && p.Status != "cancelado"
            group c by c.IngressoId into g
            select new { IngressoId = g.Key, Quantidade = g.Count() })
            .ToDictionaryAsync(x => x.IngressoId, x => x.Quantidade);

        foreach (var item in itens)
        {
            var ingresso = ingressos.First(i => i.Id == item.IngressoId);
            var disponiveis = Math.Max(0, ingresso.QuantidadeTotal - vendidos.GetValueOrDefault(ingresso.Id));

            if (item.Quantidade > disponiveis)
                return Conflict(new
                {
                    mensagem = disponiveis == 0
                        ? $"O ingresso \"{ingresso.Titulo}\" esgotou."
                        : $"Só restam {disponiveis} ingresso(s) de \"{ingresso.Titulo}\"."
                });
        }

        var pedido = new Pedido
        {
            UsuarioId = usuarioId.Value,
            EventoId = eventoId,
            Total = itens.Sum(i => ingressos.First(g => g.Id == i.IngressoId).Valor * i.Quantidade),
            Status = "pago",
            // O banco guarda hora sem fuso: sem "Kind", para o Npgsql não recusar.
            CriadoEm = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
        };

        _db.Pedidos.Add(pedido);
        await _db.SaveChangesAsync();

        var comprados = new List<IngressoComprado>();
        foreach (var item in itens)
        {
            var ingresso = ingressos.First(i => i.Id == item.IngressoId);
            for (var n = 0; n < item.Quantidade; n++)
            {
                comprados.Add(new IngressoComprado
                {
                    PedidoId = pedido.Id,
                    IngressoId = ingresso.Id,
                    Codigo = NovoCodigo(),
                    ValorPago = ingresso.Valor
                });
            }
        }

        _db.IngressosComprados.AddRange(comprados);
        await _db.SaveChangesAsync();
        await transacao.CommitAsync();

        return Created($"/api/pedidos/{pedido.Id}", new
        {
            pedido.Id,
            pedido.EventoId,
            pedido.Total,
            pedido.Status,
            pedido.CriadoEm,
            Ingressos = comprados.Select(c => new
            {
                c.Codigo,
                c.ValorPago,
                Titulo = ingressos.First(i => i.Id == c.IngressoId).Titulo
            })
        });
    }

    // GET api/pedidos/meus  (os ingressos que a pessoa logada comprou)
    [Authorize]
    [HttpGet("pedidos/meus")]
    public async Task<IActionResult> Meus()
    {
        var usuarioId = UsuarioLogadoId();
        if (usuarioId is null)
            return Unauthorized();

        var pedidos = await _db.Pedidos
            .AsNoTracking()
            .Where(p => p.UsuarioId == usuarioId)
            .OrderByDescending(p => p.CriadoEm)
            .ToListAsync();

        var pedidoIds = pedidos.Select(p => p.Id).ToList();
        var eventoIds = pedidos.Select(p => p.EventoId).Distinct().ToList();

        var eventos = await _db.Eventos
            .AsNoTracking()
            .Where(e => eventoIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id);

        var comprados = await (
            from c in _db.IngressosComprados.AsNoTracking()
            join i in _db.Ingressos.AsNoTracking() on c.IngressoId equals i.Id
            where pedidoIds.Contains(c.PedidoId)
            select new { c.PedidoId, c.Codigo, c.ValorPago, i.Titulo, i.Tipo })
            .ToListAsync();

        var resposta = pedidos.Select(p =>
        {
            eventos.TryGetValue(p.EventoId, out var evento);

            return new
            {
                p.Id,
                p.Total,
                p.Status,
                p.CriadoEm,
                Evento = evento is null ? null : new
                {
                    evento.Id,
                    evento.Nome,
                    evento.DataInicio,
                    evento.Cidade,
                    evento.LocalNome,
                    evento.Imagem
                },
                Ingressos = comprados
                    .Where(c => c.PedidoId == p.Id)
                    .Select(c => new { c.Codigo, c.Titulo, c.Tipo, c.ValorPago })
            };
        });

        return Ok(resposta);
    }
}
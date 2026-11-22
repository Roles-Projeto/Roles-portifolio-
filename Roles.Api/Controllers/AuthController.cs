using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Roles.Api.Data;
using Roles.Api.Models;

namespace Roles.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    // POST api/auth/registro
    [HttpPost("registro")]
    public async Task<IActionResult> Registrar(RegistroDto dto)
    {
        // E-mail sempre em minúsculas e sem espaços, para "Ana@x.com" e "ana@x.com" serem o mesmo.
        var email = dto.Email.Trim().ToLowerInvariant();

        if (await _db.Usuarios.AnyAsync(u => u.Email.ToLower() == email))
            return Conflict(new { mensagem = "Já existe uma conta com esse e-mail." });

        var usuario = new Usuario
        {
            Nome = dto.Nome.Trim(),
            Email = email,
            // O hash é gerado aqui; a senha original nunca é gravada.
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha),
            CriadoEm = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
        };

        _db.Usuarios.Add(usuario);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Duas pessoas cadastrando o mesmo e-mail ao mesmo tempo: o índice único do banco barra.
            return Conflict(new { mensagem = "Já existe uma conta com esse e-mail." });
        }

        // Devolve só dados públicos. O SenhaHash nunca sai da API.
        return Created(string.Empty, new { usuario.Id, usuario.Nome, usuario.Email });
    }
}
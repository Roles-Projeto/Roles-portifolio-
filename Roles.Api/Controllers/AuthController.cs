using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Roles.Api.Data;
using Roles.Api.Models;
using Roles.Api.Services;

namespace Roles.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    // Hash de uma senha que ninguém usa. Serve para gastar o mesmo tempo
    // quando o e-mail não existe, e assim não revelar quais e-mails têm conta.
    private static readonly string HashFalso = BCrypt.Net.BCrypt.HashPassword("senha-que-ninguem-usa");

    private readonly AppDbContext _db;
    private readonly TokenService _tokens;

    public AuthController(AppDbContext db, TokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    // POST api/auth/registro
    [HttpPost("registro")]
    public async Task<IActionResult> Registrar(RegistroDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();

        if (await _db.Usuarios.AnyAsync(u => u.Email.ToLower() == email))
            return Conflict(new { mensagem = "Já existe uma conta com esse e-mail." });

        var usuario = new Usuario
        {
            Nome = dto.Nome.Trim(),
            Email = email,
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
            return Conflict(new { mensagem = "Já existe uma conta com esse e-mail." });
        }

        return Created(string.Empty, new { usuario.Id, usuario.Nome, usuario.Email });
    }

    // POST api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();

        var usuario = await _db.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        // Confere a senha mesmo sem usuário (contra o hash falso), para o tempo de resposta ser parecido.
        var senhaCorreta = BCrypt.Net.BCrypt.Verify(dto.Senha, usuario?.SenhaHash ?? HashFalso);

        // A mesma mensagem para "e-mail errado" e "senha errada" evita revelar quais e-mails existem.
        if (usuario is null || !senhaCorreta)
            return Unauthorized(new { mensagem = "E-mail ou senha incorretos." });

        var (token, expiraEm) = _tokens.Gerar(usuario);

        return Ok(new
        {
            token,
            expiraEm,
            usuario = new { usuario.Id, usuario.Nome, usuario.Email }
        });
    }

    // GET api/auth/eu  (rota protegida: serve para provar que o token funciona)
    [Authorize]
    [HttpGet("eu")]
    public IActionResult Eu()
    {
        return Ok(new
        {
            id = User.FindFirst("sub")?.Value,
            nome = User.FindFirst("name")?.Value,
            email = User.FindFirst("email")?.Value
        });
    }
}
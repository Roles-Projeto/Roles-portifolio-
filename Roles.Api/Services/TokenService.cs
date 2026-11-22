using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Roles.Api.Models;

namespace Roles.Api.Services;

public class TokenService
{
    public const string Emissor = "Roles.Api";
    public const string Publico = "Roles.Web";
    private const int HorasDeValidade = 2;

    private readonly string _chave;

    public TokenService(IConfiguration configuracao)
    {
        _chave = configuracao["Jwt:Key"]
            ?? throw new InvalidOperationException("Chave 'Jwt:Key' não configurada (use dotnet user-secrets).");
    }

    public (string Token, DateTime ExpiraEm) Gerar(Usuario usuario)
    {
        var expiraEm = DateTime.UtcNow.AddHours(HorasDeValidade);

        var descritor = new SecurityTokenDescriptor
        {
            // O token carrega só dados públicos. Nunca senha nem hash.
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Name, usuario.Nome),
                new Claim(JwtRegisteredClaimNames.Email, usuario.Email)
            }),
            Issuer = Emissor,
            Audience = Publico,
            Expires = expiraEm,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_chave)),
                SecurityAlgorithms.HmacSha256)
        };

        var token = new JsonWebTokenHandler().CreateToken(descritor);
        return (token, expiraEm);
    }
}
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Roles.Api.Data;
using Roles.Api.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' não configurada.");

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Chave 'Jwt:Key' não configurada (use dotnet user-secrets).");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// CORS: quais sites (origens) podem chamar esta API pelo navegador.
// Em desenvolvimento, aceita qualquer porta de localhost / 127.0.0.1.
builder.Services.AddCors(options =>
{
    options.AddPolicy("Front", policy =>
        policy.SetIsOriginAllowed(origem =>
              {
                  var host = new Uri(origem).Host;
                  return host == "localhost" || host == "127.0.0.1";
              })
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Autenticação: a API passa a entender o "Authorization: Bearer <token>".
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Mantém os nomes originais dos campos do token ("sub", "email", "name"),
        // em vez de renomear para os nomes longos do .NET.
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = TokenService.Emissor,
            ValidateAudience = true,
            ValidAudience = TokenService.Publico,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<TokenService>();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

app.UseCors("Front");

// A ordem importa: primeiro descobre quem é (autenticação), depois decide o que pode (autorização).
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
using Microsoft.EntityFrameworkCore;
using Roles.Api.Data;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' não configurada.");

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

app.UseAuthorization();

app.MapControllers();

app.Run();
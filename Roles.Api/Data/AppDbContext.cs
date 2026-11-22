using Microsoft.EntityFrameworkCore;
using Roles.Api.Models;

namespace Roles.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Evento> Eventos => Set<Evento>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Evento>(e =>
        {
            e.ToTable("eventos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Nome).HasColumnName("nome");
            e.Property(x => x.Assunto).HasColumnName("assunto");
            e.Property(x => x.Categoria).HasColumnName("categoria");
            e.Property(x => x.Imagem).HasColumnName("imagem");
            e.Property(x => x.DataInicio).HasColumnName("data_inicio");
            e.Property(x => x.DataFim).HasColumnName("data_fim");
            e.Property(x => x.Descricao).HasColumnName("descricao");
            e.Property(x => x.LocalNome).HasColumnName("local_nome");
            e.Property(x => x.Cep).HasColumnName("cep");
            e.Property(x => x.Rua).HasColumnName("rua");
            e.Property(x => x.Cidade).HasColumnName("cidade");
            e.Property(x => x.Estado).HasColumnName("estado");
            e.Property(x => x.NomeProdutor).HasColumnName("nome_produtor");
            e.Property(x => x.CriadoEm).HasColumnName("criado_em");
        });
    }
}
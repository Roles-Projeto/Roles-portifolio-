using Microsoft.EntityFrameworkCore;
using Roles.Api.Models;

namespace Roles.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Evento> Eventos => Set<Evento>();
    public DbSet<Ingresso> Ingressos => Set<Ingresso>();

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
            e.Property(x => x.DataInicio).HasColumnName("data_inicio").HasColumnType("timestamp without time zone");
            e.Property(x => x.DataFim).HasColumnName("data_fim").HasColumnType("timestamp without time zone");
            e.Property(x => x.Descricao).HasColumnName("descricao");
            e.Property(x => x.LocalNome).HasColumnName("local_nome");
            e.Property(x => x.Cep).HasColumnName("cep");
            e.Property(x => x.Rua).HasColumnName("rua");
            e.Property(x => x.Cidade).HasColumnName("cidade");
            e.Property(x => x.Estado).HasColumnName("estado");
            e.Property(x => x.NomeProdutor).HasColumnName("nome_produtor");
            e.Property(x => x.CriadoEm).HasColumnName("criado_em").HasColumnType("timestamp without time zone");
        });

        modelBuilder.Entity<Ingresso>(i =>
        {
            i.ToTable("ingressos");
            i.HasKey(x => x.Id);
            i.Property(x => x.Id).HasColumnName("id");
            i.Property(x => x.EventoId).HasColumnName("evento_id");
            i.Property(x => x.Titulo).HasColumnName("titulo");
            i.Property(x => x.Tipo).HasColumnName("tipo");
            i.Property(x => x.Valor).HasColumnName("valor").HasColumnType("numeric(10,2)");
            i.Property(x => x.QuantidadeTotal).HasColumnName("quantidade_total");

            // Um evento tem vários ingressos; apagar o evento apaga os ingressos (igual ao banco).
            i.HasOne<Evento>()
                .WithMany()
                .HasForeignKey(x => x.EventoId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
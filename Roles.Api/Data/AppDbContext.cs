using Microsoft.EntityFrameworkCore;
using Roles.Api.Models;

namespace Roles.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Evento> Eventos => Set<Evento>();
    public DbSet<Ingresso> Ingressos => Set<Ingresso>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Lugar> Lugares => Set<Lugar>();
    public DbSet<LugarHorario> LugarHorarios => Set<LugarHorario>();
    public DbSet<Pedido> Pedidos => Set<Pedido>();
    public DbSet<IngressoComprado> IngressosComprados => Set<IngressoComprado>();

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
            e.Property(x => x.UsuarioId).HasColumnName("usuario_id");
            e.Property(x => x.LugarId).HasColumnName("lugar_id");

            // Um usuário tem vários eventos; apagar o usuário mantém os eventos (sem dono).
            e.HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            // Um lugar recebe vários eventos; apagar o lugar mantém os eventos (sem lugar).
            e.HasOne<Lugar>()
                .WithMany()
                .HasForeignKey(x => x.LugarId)
                .OnDelete(DeleteBehavior.SetNull);
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

        modelBuilder.Entity<Usuario>(u =>
        {
            u.ToTable("usuarios");
            u.HasKey(x => x.Id);
            u.Property(x => x.Id).HasColumnName("id");
            u.Property(x => x.Nome).HasColumnName("nome");
            u.Property(x => x.Email).HasColumnName("email");
            u.Property(x => x.SenhaHash).HasColumnName("senha_hash");
            u.Property(x => x.CriadoEm).HasColumnName("criado_em").HasColumnType("timestamp without time zone");
        });

        modelBuilder.Entity<Lugar>(l =>
        {
            l.ToTable("lugares");
            l.HasKey(x => x.Id);
            l.Property(x => x.Id).HasColumnName("id");
            l.Property(x => x.Nome).HasColumnName("nome");
            l.Property(x => x.Tipo).HasColumnName("tipo");
            l.Property(x => x.Descricao).HasColumnName("descricao");
            l.Property(x => x.Imagem).HasColumnName("imagem");
            l.Property(x => x.FaixaPreco).HasColumnName("faixa_preco");
            l.Property(x => x.Cep).HasColumnName("cep");
            l.Property(x => x.Rua).HasColumnName("rua");
            l.Property(x => x.Bairro).HasColumnName("bairro");
            l.Property(x => x.Cidade).HasColumnName("cidade");
            l.Property(x => x.Estado).HasColumnName("estado");
            l.Property(x => x.Telefone).HasColumnName("telefone");
            l.Property(x => x.Instagram).HasColumnName("instagram");
            l.Property(x => x.CriadoEm).HasColumnName("criado_em").HasColumnType("timestamp without time zone");
            l.Property(x => x.UsuarioId).HasColumnName("usuario_id");

            l.HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            // Apagar o lugar apaga os horários dele.
            l.HasMany(x => x.Horarios)
                .WithOne()
                .HasForeignKey(h => h.LugarId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LugarHorario>(h =>
        {
            h.ToTable("lugar_horarios");
            h.HasKey(x => x.Id);
            h.Property(x => x.Id).HasColumnName("id");
            h.Property(x => x.LugarId).HasColumnName("lugar_id");
            h.Property(x => x.DiaSemana).HasColumnName("dia_semana");
            h.Property(x => x.Fechado).HasColumnName("fechado");
            h.Property(x => x.Abre).HasColumnName("abre");
            h.Property(x => x.Fecha).HasColumnName("fecha");
        });

        modelBuilder.Entity<Pedido>(p =>
        {
            p.ToTable("pedidos");
            p.HasKey(x => x.Id);
            p.Property(x => x.Id).HasColumnName("id");
            p.Property(x => x.UsuarioId).HasColumnName("usuario_id");
            p.Property(x => x.EventoId).HasColumnName("evento_id");
            p.Property(x => x.Total).HasColumnName("total").HasColumnType("numeric(10,2)");
            p.Property(x => x.Status).HasColumnName("status");
            p.Property(x => x.CriadoEm).HasColumnName("criado_em").HasColumnType("timestamp without time zone");

            // Quem já comprou não some: não dá para apagar usuário ou evento que tenha pedido.
            p.HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);

            p.HasOne<Evento>()
                .WithMany()
                .HasForeignKey(x => x.EventoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<IngressoComprado>(c =>
        {
            c.ToTable("ingressos_comprados");
            c.HasKey(x => x.Id);
            c.Property(x => x.Id).HasColumnName("id");
            c.Property(x => x.PedidoId).HasColumnName("pedido_id");
            c.Property(x => x.IngressoId).HasColumnName("ingresso_id");
            c.Property(x => x.Codigo).HasColumnName("codigo");
            c.Property(x => x.ValorPago).HasColumnName("valor_pago").HasColumnType("numeric(10,2)");

            // Apagar o pedido apaga os ingressos dele; o tipo de ingresso não pode sumir se já foi vendido.
            c.HasOne<Pedido>()
                .WithMany()
                .HasForeignKey(x => x.PedidoId)
                .OnDelete(DeleteBehavior.Cascade);

            c.HasOne<Ingresso>()
                .WithMany()
                .HasForeignKey(x => x.IngressoId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
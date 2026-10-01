using Microsoft.EntityFrameworkCore;
using SiteNotes.Application.Abstractions;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Infrastructure.Persistence;

public sealed class SiteNotesDbContext : DbContext, IUnitOfWork
{
    public DbSet<Reference> References { get; init; } = null!;
    public DbSet<Note> Notes { get; init; } = null!;

    public SiteNotesDbContext(DbContextOptions<SiteNotesDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SiteNotesDbContext).Assembly);
    }
}

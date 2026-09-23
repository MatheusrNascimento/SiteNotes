using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using SiteNotes.Infrastructure.Persistence.Documents;

namespace SiteNotes.Infrastructure.Persistence;

public class SiteNotesDbContext : DbContext
{
    public DbSet<ReferenceDocument> References { get; init; } = null!;
    public DbSet<NoteDocument> Notes { get; init; } = null!;

    public SiteNotesDbContext(DbContextOptions<SiteNotesDbContext> options)
        : base(options)
    {
        Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ReferenceDocument>().ToCollection("references");
        modelBuilder.Entity<NoteDocument>().ToCollection("notes");
    }
}

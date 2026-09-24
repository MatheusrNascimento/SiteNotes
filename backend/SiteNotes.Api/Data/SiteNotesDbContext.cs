using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using SiteNotes.Api.Models;

namespace SiteNotes.Api.Data;

public class SiteNotesDbContext : DbContext
{
    public DbSet<Reference> References { get; init; } = null!;
    public DbSet<NoteEntry> Notes { get; init; } = null!;

    public SiteNotesDbContext(DbContextOptions<SiteNotesDbContext> options)
        : base(options)
    {
        // MongoDB standalone (dev local) nao suporte transactions; replica set sim.
        Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Reference>().ToCollection("references");
        modelBuilder.Entity<NoteEntry>().ToCollection("notes");
    }
}

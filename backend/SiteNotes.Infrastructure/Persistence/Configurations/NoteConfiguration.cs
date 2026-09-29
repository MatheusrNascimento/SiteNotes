using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Infrastructure.Persistence.Configurations;

internal sealed class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("notes");
        builder.ConfigureBase();

        builder.Property(note => note.Content)
            .HasColumnType("text")
            .IsRequired();

        builder.Property(note => note.ReferenceId).IsRequired();

        builder.HasOne<Reference>()
            .WithMany()
            .HasForeignKey(note => note.ReferenceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(note => note.ReferenceId);
    }
}

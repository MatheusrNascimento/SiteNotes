using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SiteNotes.Domain.References;

namespace SiteNotes.Infrastructure.Persistence.Configurations;

internal sealed class ReferenceConfiguration : IEntityTypeConfiguration<Reference>
{
    public void Configure(EntityTypeBuilder<Reference> builder)
    {
        builder.ToTable("references");
        builder.ConfigureBase();

        builder.Property(reference => reference.Url)
            .HasConversion(url => url.Value, stored => PageUrl.Restore(stored))
            .HasColumnType("text")
            .IsRequired();

        builder.Property(reference => reference.Title)
            .HasColumnType("text")
            .IsRequired();

        var tagsConverter = new ValueConverter<List<Tag>, string[]>(
            tags => tags.Select(tag => tag.Value).ToArray(),
            stored => stored.Select(Tag.Restore).ToList());

        var tagsComparer = new ValueComparer<List<Tag>>(
            (left, right) => ReferenceEquals(left, right) || (left != null && right != null && left.SequenceEqual(right)),
            tags => tags == null ? 0 : tags.Aggregate(0, (hash, tag) => HashCode.Combine(hash, tag.GetHashCode())),
            tags => tags == null ? null! : tags.ToList());

        builder.Property<List<Tag>>("_tags")
            .HasColumnName("tags")
            .HasColumnType("text[]")
            .HasConversion(tagsConverter, tagsComparer)
            .IsRequired();

        builder.Ignore(reference => reference.Tags);

        builder.HasIndex(reference => reference.UpdatedAt);
    }
}

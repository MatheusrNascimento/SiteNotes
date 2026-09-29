using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SiteNotes.Domain.Common;

namespace SiteNotes.Infrastructure.Persistence.Configurations;

internal static class BaseEntityConfiguration
{
    public static void ConfigureBase<TEntity>(this EntityTypeBuilder<TEntity> builder)
        where TEntity : BaseEntity
    {
        builder.HasKey(entity => entity.Id);

        builder.Property(entity => entity.Id)
            .UseIdentityAlwaysColumn()
            .ValueGeneratedOnAdd();

        builder.Property(entity => entity.CreatedAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.Property(entity => entity.UpdatedAt)
            .HasColumnType("timestamp with time zone")
            .IsRequired();
    }
}

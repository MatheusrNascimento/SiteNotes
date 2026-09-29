using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;
using SiteNotes.Infrastructure.Persistence;

namespace SiteNotes.Tests.Infrastructure;

public class PersistenceModelTests : IDisposable
{
    private readonly SiteNotesDbContext _db;

    public PersistenceModelTests()
    {
        var options = new DbContextOptionsBuilder<SiteNotesDbContext>()
            .UseNpgsql("Host=localhost;Database=model_only")
            .UseSnakeCaseNamingConvention()
            .Options;
        _db = new SiteNotesDbContext(options);
    }

    [Fact]
    public void Ids_AreGeneratedByTheDatabase()
    {
        foreach (var type in new[] { typeof(Reference), typeof(Note) })
        {
            var id = _db.Model.FindEntityType(type)!.FindProperty("Id")!;

            Assert.Equal(ValueGenerated.OnAdd, id.ValueGenerated);
            Assert.Equal(typeof(long), id.ClrType);
        }
    }

    [Fact]
    public void Tags_AreMappedFromTheBackingFieldAsTextArray()
    {
        var tags = _db.Model.FindEntityType(typeof(Reference))!.FindProperty("_tags")!;

        Assert.False(tags.IsShadowProperty());
        Assert.Equal("text[]", tags.GetColumnType());
        Assert.Equal("tags", tags.GetColumnName());
    }

    [Fact]
    public void Tables_UseSnakeCaseNames()
    {
        Assert.Equal("references", _db.Model.FindEntityType(typeof(Reference))!.GetTableName());
        Assert.Equal("notes", _db.Model.FindEntityType(typeof(Note))!.GetTableName());
    }

    [Fact]
    public void DeletingReference_CascadesToNotes()
    {
        var foreignKey = _db.Model.FindEntityType(typeof(Note))!.GetForeignKeys().Single();

        Assert.Equal(typeof(Reference), foreignKey.PrincipalEntityType.ClrType);
        Assert.Equal(DeleteBehavior.Cascade, foreignKey.DeleteBehavior);
    }

    public void Dispose() => _db.Dispose();
}

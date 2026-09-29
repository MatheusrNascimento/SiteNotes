using SiteNotes.Domain.Common;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Domain.Common;

public class BaseEntityTests
{
    private static readonly DateTime Now = new(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Entities_InheritFromBaseEntity()
    {
        Assert.IsAssignableFrom<BaseEntity>(Reference.Create("https://example.com", null, null, Now));
        Assert.IsAssignableFrom<BaseEntity>(Note.Create(1, "texto", Now));
    }

    [Fact]
    public void NewEntities_HaveNoIdUntilTheDatabaseAssignsOne()
    {
        var reference = Reference.Create("https://example.com", null, null, Now);
        var note = Note.Create(1, "texto", Now);

        Assert.Equal(0, reference.Id);
        Assert.Equal(0, note.Id);
    }

    [Fact]
    public void Creation_InitializesBothTimestamps()
    {
        var reference = Reference.Create("https://example.com", null, null, Now);

        Assert.Equal(Now, reference.CreatedAt);
        Assert.Equal(Now, reference.UpdatedAt);
    }

    [Fact]
    public void Behaviors_OnlyMoveUpdatedAt()
    {
        var note = Note.Create(1, "texto", Now);
        var later = Now.AddMinutes(1);

        note.Revise("novo", later);

        Assert.Equal(Now, note.CreatedAt);
        Assert.Equal(later, note.UpdatedAt);
    }
}

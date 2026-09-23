using SiteNotes.Domain.Common;
using SiteNotes.Domain.References;
using SiteNotes.Domain.Services;

namespace SiteNotes.Tests.Domain.Services;

public class ReferenceNoteServiceTests
{
    [Fact]
    public void Add_CreatesNoteBoundToReferenceAndTouchesActivity()
    {
        var createdAt = new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);
        var notedAt = createdAt.AddMinutes(30);
        var reference = Reference.Create("https://example.com", "Artigo", null, createdAt);
        var service = new ReferenceNoteService();

        var note = service.Add(reference, "  trecho importante  ", notedAt);

        Assert.Equal(reference.Id, note.ReferenceId);
        Assert.Equal("trecho importante", note.Content);
        Assert.Equal(notedAt, note.CreatedAt);
        Assert.Equal(notedAt, reference.UpdatedAt);
    }

    [Fact]
    public void Add_RejectsBlankContentWithoutChangingReference()
    {
        var createdAt = new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);
        var reference = Reference.Create("https://example.com", "Artigo", null, createdAt);
        var service = new ReferenceNoteService();

        Assert.Throws<DomainException>(() => service.Add(reference, " ", createdAt.AddMinutes(1)));
        Assert.Equal(createdAt, reference.UpdatedAt);
    }
}

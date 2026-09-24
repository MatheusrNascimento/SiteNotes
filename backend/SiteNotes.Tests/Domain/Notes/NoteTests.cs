using SiteNotes.Domain.Common;
using SiteNotes.Domain.Notes;
using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Domain.Notes;

public class NoteTests
{
    private static readonly DateTime Now = new(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Create_TrimsContentAndStoresReference()
    {
        var referenceId = ReferenceId.New();

        var note = Note.Create(referenceId, "  primeira anotacao  ", Now);

        Assert.Equal(referenceId, note.ReferenceId);
        Assert.Equal("primeira anotacao", note.Content);
        Assert.Equal(Now, note.CreatedAt);
        Assert.Equal(Now, note.UpdatedAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_RejectsBlankContent(string? content)
    {
        var exception = Assert.Throws<DomainException>(() => Note.Create(ReferenceId.New(), content, Now));

        Assert.Equal("Conteudo da anotacao nao pode ser vazio.", exception.Message);
    }

    [Fact]
    public void Revise_UpdatesContentAndTimestamp()
    {
        var note = Note.Create(ReferenceId.New(), "original", Now);
        var later = Now.AddMinutes(10);

        note.Revise("  revisada  ", later);

        Assert.Equal("revisada", note.Content);
        Assert.Equal(later, note.UpdatedAt);
        Assert.Equal(Now, note.CreatedAt);
    }

    [Fact]
    public void ByMostRecent_OrdersDescendingByCreation()
    {
        var referenceId = ReferenceId.New();
        var older = Note.Create(referenceId, "antiga", Now);
        var newer = Note.Create(referenceId, "nova", Now.AddHours(1));

        var ordered = Note.ByMostRecent([older, newer]).ToList();

        Assert.Equal(["nova", "antiga"], ordered.Select(note => note.Content).ToArray());
    }
}

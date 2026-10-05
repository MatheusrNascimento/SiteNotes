using SiteNotes.Domain.Common;
using SiteNotes.Domain.Notes;

namespace SiteNotes.Tests.Domain.Notes;

public class NoteTests
{
    private static readonly DateTime Now = new(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Create_TrimsContentAndStoresReference()
    {
        var note = Note.Create(7, "  primeira anotacao  ", Now);

        Assert.Equal(7, note.ReferenceId);
        Assert.Equal("primeira anotacao", note.Content);
        Assert.Equal(0, note.Id);
        Assert.Equal(Now, note.CreatedAt);
        Assert.Equal(Now, note.UpdatedAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_RejectsInvalidReference(long referenceId)
    {
        var exception = Assert.Throws<DomainException>(() => Note.Create(referenceId, "texto", Now));

        Assert.Equal(DomainErrors.Notes.InvalidReference, exception.Message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_RejectsBlankContent(string? content)
    {
        var exception = Assert.Throws<DomainException>(() => Note.Create(1, content, Now));

        Assert.Equal(DomainErrors.Notes.EmptyContent, exception.Message);
    }

    [Fact]
    public void Create_AcceptsTipTapJsonWithHttpLink()
    {
        const string content = """
            {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"patos na lagoa","marks":[{"type":"link","attrs":{"href":"https://youtube.com/watch?v=123"}}]}]}]}
            """;

        var note = Note.Create(1, content, Now);

        Assert.Contains("patos na lagoa", note.Content, StringComparison.Ordinal);
        Assert.Contains("https://youtube.com/watch?v=123", note.Content, StringComparison.Ordinal);
        Assert.Contains("\"type\":\"doc\"", note.Content, StringComparison.Ordinal);
        Assert.Contains("noopener noreferrer nofollow", note.Content, StringComparison.Ordinal);
    }

    [Fact]
    public void Create_RejectsEmptyTipTapDoc()
    {
        const string content = """{"type":"doc","content":[{"type":"paragraph"}]}""";

        var exception = Assert.Throws<DomainException>(() => Note.Create(1, content, Now));

        Assert.Equal(DomainErrors.Notes.EmptyContent, exception.Message);
    }

    [Fact]
    public void Create_StripsUnsafeLinkMarks()
    {
        const string content = """
            {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"clique aqui","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}
            """;

        var note = Note.Create(1, content, Now);

        Assert.Contains("clique aqui", note.Content, StringComparison.Ordinal);
        Assert.DoesNotContain("javascript:", note.Content, StringComparison.Ordinal);
        Assert.DoesNotContain("\"type\":\"link\"", note.Content, StringComparison.Ordinal);
    }

    [Fact]
    public void Revise_UpdatesContentAndTimestamp()
    {
        var note = Note.Create(1, "original", Now);
        var later = Now.AddMinutes(10);

        note.Revise("  revisada  ", later);

        Assert.Equal("revisada", note.Content);
        Assert.Equal(later, note.UpdatedAt);
        Assert.Equal(Now, note.CreatedAt);
    }

    [Fact]
    public void ByMostRecent_OrdersDescendingByCreation()
    {
        var older = Note.Create(1, "antiga", Now);
        var newer = Note.Create(1, "nova", Now.AddHours(1));

        var ordered = Note.ByMostRecent([older, newer]).ToList();

        Assert.Equal(["nova", "antiga"], ordered.Select(note => note.Content).ToArray());
    }
}

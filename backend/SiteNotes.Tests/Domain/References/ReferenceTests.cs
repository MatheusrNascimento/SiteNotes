using SiteNotes.Domain.Common;
using SiteNotes.Domain.References;

namespace SiteNotes.Tests.Domain.References;

public class ReferenceTests
{
    private static readonly DateTime Now = new(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Create_UsesUrlAsTitleWhenTitleIsMissing()
    {
        var reference = Reference.Create(" https://example.com/artigo ", "  ", ["leitura"], Now);

        Assert.Equal("https://example.com/artigo", reference.Url.Value);
        Assert.Equal("https://example.com/artigo", reference.Title);
        Assert.Equal(Now, reference.CreatedAt);
        Assert.Equal(Now, reference.UpdatedAt);
    }

    [Fact]
    public void Create_TrimsTitleAndNormalizesTags()
    {
        var reference = Reference.Create(
            "https://example.com",
            "  Artigo  ",
            [" C# ", "c#", "", "  ", "Mongo"],
            Now);

        Assert.Equal("Artigo", reference.Title);
        Assert.Equal(["C#", "Mongo"], reference.Tags.Select(tag => tag.Value).ToArray());
    }

    [Fact]
    public void Create_RejectsEmptyUrl()
    {
        var exception = Assert.Throws<DomainException>(() => Reference.Create("  ", "Titulo", null, Now));

        Assert.Equal("Url e obrigatoria.", exception.Message);
    }

    [Fact]
    public void ChangeDetails_KeepsUrlAndTitleWhenBlankAndReplacesTags()
    {
        var reference = Reference.Create("https://example.com", "Artigo", ["antiga"], Now);
        var later = Now.AddHours(2);

        reference.ChangeDetails("  ", null, ["nova", "Nova"], later);

        Assert.Equal("https://example.com", reference.Url.Value);
        Assert.Equal("Artigo", reference.Title);
        Assert.Equal(["nova"], reference.Tags.Select(tag => tag.Value).ToArray());
        Assert.Equal(later, reference.UpdatedAt);
        Assert.Equal(Now, reference.CreatedAt);
    }

    [Fact]
    public void RegisterActivity_UpdatesTimestamp()
    {
        var reference = Reference.Create("https://example.com", "Artigo", null, Now);
        var later = Now.AddMinutes(5);

        reference.RegisterActivity(later);

        Assert.Equal(later, reference.UpdatedAt);
    }

    [Fact]
    public void Matches_FiltersByTitleUrlAndTagIgnoringCase()
    {
        var reference = Reference.Create("https://example.com/dotnet", "Guia DDD", ["Arquitetura"], Now);

        Assert.True(reference.Matches("ddd", null));
        Assert.True(reference.Matches("DOTNET", null));
        Assert.True(reference.Matches(null, "arquitetura"));
        Assert.False(reference.Matches("java", null));
        Assert.False(reference.Matches(null, "banco"));
    }
}

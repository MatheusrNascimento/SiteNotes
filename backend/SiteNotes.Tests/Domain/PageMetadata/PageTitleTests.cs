using SiteNotes.Domain.PageMetadata;

namespace SiteNotes.Tests.Domain.PageMetadata;

public class PageTitleTests
{
    [Fact]
    public void Normalize_CollapsesWhitespaceAndRemovesYouTubeSuffix()
    {
        var title = PageTitle.Normalize("  Meu&nbsp;video   - YouTube  ");

        Assert.Equal("Meu video", title);
    }
}

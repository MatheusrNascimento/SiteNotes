using Microsoft.Extensions.Logging.Abstractions;
using SiteNotes.Application.PageMetadata;
using SiteNotes.Domain.Common;
using SiteNotes.Tests.Support;

namespace SiteNotes.Tests.Application;

public class PageMetadataServiceTests
{
    private readonly FakePageContentReader _reader = new();
    private readonly PageMetadataService _service;

    public PageMetadataServiceTests()
    {
        _service = new PageMetadataService(_reader, NullLogger<PageMetadataService>.Instance);
    }

    [Fact]
    public async Task GetAsync_RequiresUrl()
    {
        var exception = await Assert.ThrowsAsync<DomainException>(() => _service.GetAsync("  ", CancellationToken.None));

        Assert.Equal("Url e obrigatoria.", exception.Message);
        Assert.Equal(0, _reader.Calls);
    }

    [Fact]
    public async Task GetAsync_DoesNotFetchBlockedHosts()
    {
        var metadata = await _service.GetAsync("http://localhost/notas", CancellationToken.None);

        Assert.Equal("blocked-host", metadata.Source);
        Assert.Equal("localhost", metadata.Title);
        Assert.Equal(0, _reader.Calls);
    }

    [Fact]
    public async Task GetAsync_UsesYouTubeTitleWhenAvailable()
    {
        _reader.YouTubeTitle = "  Aula   - YouTube ";

        var metadata = await _service.GetAsync("https://www.youtube.com/watch?v=abc123", CancellationToken.None);

        Assert.Equal("youtube", metadata.Source);
        Assert.Equal("Aula", metadata.Title);
        Assert.Equal(1, _reader.Calls);
    }

    [Fact]
    public async Task GetAsync_ReadsTitleFromHtml()
    {
        _reader.Html = """<meta property="og:title" content="Pagina lida">""";

        var metadata = await _service.GetAsync("https://example.com/artigo", CancellationToken.None);

        Assert.Equal("page", metadata.Source);
        Assert.Equal("Pagina lida", metadata.Title);
    }

    [Fact]
    public async Task GetAsync_FallsBackToHostWhenContentCannotBeRead()
    {
        _reader.Error = new HttpRequestException("offline");

        var metadata = await _service.GetAsync("https://www.example.com/artigo", CancellationToken.None);

        Assert.Equal("fallback", metadata.Source);
        Assert.Equal("example.com", metadata.Title);
    }
}

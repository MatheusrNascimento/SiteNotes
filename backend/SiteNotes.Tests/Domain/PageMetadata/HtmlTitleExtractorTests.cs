using SiteNotes.Domain.PageMetadata;

namespace SiteNotes.Tests.Domain.PageMetadata;

public class HtmlTitleExtractorTests
{
    [Fact]
    public void Extract_PrefersOpenGraphTitle()
    {
        const string html = """
            <html><head>
            <title>Documento</title>
            <meta property="og:title" content="Titulo social" />
            </head><body><h1>Cabecalho</h1></body></html>
            """;

        Assert.Equal("Titulo social", HtmlTitleExtractor.Extract(html));
    }

    [Fact]
    public void Extract_FallsBackToTwitterHeadingAndDocumentTitle()
    {
        Assert.Equal("Twitter", HtmlTitleExtractor.Extract("""<meta name="twitter:title" content="Twitter">"""));
        Assert.Equal("Cabecalho", HtmlTitleExtractor.Extract("<h1>Cabecalho</h1>"));
        Assert.Equal("Documento", HtmlTitleExtractor.Extract("<title>Documento</title>"));
    }

    [Fact]
    public void Extract_ReturnsNullWhenNoTitleExists()
    {
        Assert.Null(HtmlTitleExtractor.Extract("<html><body>sem titulo</body></html>"));
    }
}

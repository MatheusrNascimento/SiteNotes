using SiteNotes.Application.PageMetadata;

namespace SiteNotes.Tests.Support;

internal sealed class FakePageContentReader : IPageContentReader
{
    public string? YouTubeTitle { get; set; }
    public string? Html { get; set; }
    public int Calls { get; private set; }
    public Exception? Error { get; set; }

    public Task<string?> TryReadYouTubeTitleAsync(Uri pageUrl, CancellationToken cancellationToken)
    {
        Calls++;
        if (Error is not null)
        {
            throw Error;
        }

        return Task.FromResult(YouTubeTitle);
    }

    public Task<string?> TryReadHtmlAsync(Uri pageUrl, CancellationToken cancellationToken)
    {
        Calls++;
        if (Error is not null)
        {
            throw Error;
        }

        return Task.FromResult(Html);
    }
}
